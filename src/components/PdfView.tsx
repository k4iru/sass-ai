"use client";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Document, Page, pdfjs } from "react-pdf";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Loader2Icon, RotateCw, ZoomInIcon } from "lucide-react";
import { downloadFileToBuffer } from "@/lib/s3";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function PdfView({ userId, fileId }: { userId: string; fileId: string }) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [file, setFile] = useState<Blob | null>();
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const key = `${userId}/${fileId}`;
    const fetchFile = async () => {
      const res = await downloadFileToBuffer(key);
      const file = new Blob([res], { type: "application/pdf" });
      setFile(file);
    };
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
