'use client';

import { useTransition, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import throttle from 'lodash.throttle';
import { Progress } from '@/components/ui/progress';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { FileTextIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { TFileSchema } from '@/db/schema';
import { formatBytes } from '@/lib/utils';
import { DropZone } from '@/components/drop-zone';
import { Button } from '@/components/ui/button';
import { getFiles } from '@/actions/get-files';
import { api } from '@/lib/api';
import { Spinner } from '@/components/spinner';

const maxFileSizeMb = 30;
const formSchema = z.object({
  file: z
    .custom<FileList>()
    .transform((val) => {
      if (val instanceof File) return val;
      if (val instanceof FileList) return val[0];
      return null;
    })
    .superRefine((file, ctx) => {
      if (!(file instanceof File)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          fatal: true,
          message: 'Not a file',
        });

        return z.NEVER;
      }

      if (file.size > maxFileSizeMb * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Max file size allowed is ${maxFileSizeMb}MB`,
        });
      }

      if (!['application/pdf', 'text/plain'].includes(file.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'File must be an document (pdf, txt)',
        });
      }
    })
    .pipe(z.custom<File>()),
});

type TFormSchema = z.infer<typeof formSchema>;

export default function Page() {
  const [progress, setProgress] = useState(0);
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [filesLoading, setFilesLoading] = useState<boolean>(true);
  const [filename, setFilename] = useState<string>('');
  const [filesize, setFilesize] = useState<number>(0);
  const [, startTransition] = useTransition();
  const [files, setFiles] = useState<TFileSchema[]>([]);
  const [fadeOut, setFadeOut] = useState<boolean>(false);
  const [isEmbedding, setIsEmbedding] = useState<boolean>(false);

  const form = useForm<TFormSchema>({
    resolver: zodResolver(formSchema),
  });

  const { ref: fileRef, ...fileRest } = form.register('file');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadFiles().catch(console.error);
  }, [fileLoading]);

  const loadFiles = async () => {
    setFilesLoading(true);
    startTransition(async () => {
      const fileList = await getFiles();
      setFiles(fileList);
      setFilesLoading(false);
    });
  };

  const updateProgress = throttle(
    (percent: number) => {
      setProgress(percent);
    },
    100,
    { leading: true, trailing: true }
  );

  const onSubmit = async (formFileData: TFormSchema) => {
    setFileLoading(true);

    let formData = new FormData();
    formData.append('file', formFileData.file, formFileData.file.name);

    setFilename(formFileData.file.name);
    setFilesize(formFileData.file.size);

    const requestOptions: RequestInit = {
      method: 'POST',
      body: formData,
    };

    try {
      const response = await fetch('/api/documents', requestOptions);
      if (!response.ok) throw new Error('Failed to upload');
      const data = await response.body;

      const reader = data?.getReader();
      if (reader == null) return;

      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedLength += value.length;
        const step = parseFloat((receivedLength / formFileData.file.size).toFixed(2)) * 100;
        updateProgress(step);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      toast.success(`Document uploaded successfully!`, {
        description: `File: ${formFileData.file.name}`,
      });

      setTimeout(() => {
        setFadeOut(true);
      }, 2000);
      setTimeout(() => {
        setFileLoading(false);
        setFilename('');
        setFilesize(0);
        updateProgress(0);
      }, 3000);
    }
  };

  const onFileSelected = async (file: File) => {
    form.setValue('file', file);
    const isValid = await form.trigger();
    if (isValid) {
      form.handleSubmit(onSubmit)();

      setFilename(file.name);
      setFilesize(file.size);
      setFileLoading(true);
      setFadeOut(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files) {
      const file = e.target.files[0];
      onFileSelected(file);
    }
  };

  const embedDocumentPost = async (documentId: number) => {
    setIsEmbedding(true);
    const response = await api.postEmbedDocument(documentId, 'nomic-embed-text');

    if (response.success) {
      toast.success('Document embedded successfully');
    } else {
      toast.error('Failed to embed document', {
        description: response.errorMessage,
      });
    }
    loadFiles().catch(console.error);
    setIsEmbedding(false);
  };

  return (
    <section className="flex ps-4">
      <div className="basis-3/4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
            <FormField
              control={form.control}
              name="file"
              render={() => {
                return (
                  <FormItem>
                    <FormControl>
                      <input
                        type="file"
                        multiple={false}
                        className="hidden"
                        {...fileRest}
                        ref={(e) => {
                          fileRef(e);
                          fileInputRef.current = e;
                        }}
                        onChange={handleChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <DropZone onFileSelected={onFileSelected} fileInputRef={fileInputRef} />
          </form>
        </Form>

        {fileLoading && (
          <div
            className={`${fadeOut ? 'opacity-0' : 'opacity-100'} flex items-center space-x-4 rounded-md border p-4 transition-opacity duration-1000 ease-in-out`}
          >
            <div className="flex-1 space-y-1">
              <p className="mb-2 text-sm font-medium leading-none">{filename}</p>
              <div className="text-sm text-muted-foreground">
                <Progress value={progress} className="w-full" />
                <div className="flex justify-between">
                  <p className="mt-1">{formatBytes(filesize)}</p>
                  <p className="mt-1">{progress?.toFixed()}% Complete</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Document</TableHead>
              <TableHead className="w-[10%] text-right">Size</TableHead>
              <TableHead className="w-[18%]">Upload Date</TableHead>
              <TableHead className="w-[32%] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.filename}>
                <TableCell className="flex items-center font-medium">
                  <FileTextIcon className="me-2" />
                  <span>
                    #{file.id} {file.filename}
                  </span>
                </TableCell>
                <TableCell className="text-right">{formatBytes(file.fileSize ?? 0)}</TableCell>
                <TableCell>{file.timestamp}</TableCell>
                <TableCell className="flex justify-end gap-2 text-right text-xs">
                  {!file.isEmbedded ? (
                    <>
                      <p>
                        with Ollama: <br />
                        <strong>nomic-embed-text</strong>
                      </p>
                      <Button size={'sm'} onClick={() => embedDocumentPost(file.id)} disabled={isEmbedding}>
                        {isEmbedding && <Spinner color="" />}
                        Embedd
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>
                        Embedded with ollama: <br />
                        <strong>{file.embedModel}</strong>
                      </p>
                      <Button size={'sm'}>
                        Question with AI <ArrowRightIcon className="ms-2" />{' '}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filesLoading && (
              <TableRow key="loading">
                <TableCell>
                  <Skeleton className="h-3 w-full rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3 w-full rounded-full" />
                </TableCell>
                <TableCell colSpan={2}>
                  <Skeleton className="h-3 w-full rounded-full" />
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="basis-1/4 pt-3 ps-3">
        <div>
          <Button
            className='w-full'
            onClick={() => {
              toast.success('Document embedded successfully');
            }}
          >
            Toast
          </Button>
        </div>
      </div>
      <Toaster position="bottom-center" richColors closeButton />
    </section>
  );
}
