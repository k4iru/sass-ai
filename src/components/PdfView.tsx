"use client";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Document, Page, pdfjs } from "react-pdf";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Loader2Icon, RotateCw, ZoomInIcon } from "lucide-react";
import { downloadFileToBuffer } from "@/lib/s3";
import { getFileBuffer } from "@/actions/getFileBuffer";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PdfView({ userId, fileId }: { userId: string; fileId: string }) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [file, setFile] = useState<Blob>();
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const fetchFile = async () => {
      // get file via server action
      if (userId && fileId) {
        console.log("inside pdfviewer");
        const key = `${userId}/${fileId}`;
        console.log(key);

        const file = await getFileBuffer(key);
        setFile(file);
      }
    };

    fetchFile();
  }, [fileId, userId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    setNumPages(numPages);
  };
  return (
    <div>
      <Document
        loading={null}
        file={file}
        rotate={rotation}
        onLoadSuccess={onDocumentLoadSuccess}
        className="m-4 overflow-scroll">
        <Page
          className="shadow-lg"
          scale={scale}
          pageNumber={pageNumber}
        />
      </Document>
    </div>
  );
}

export default PdfView;
