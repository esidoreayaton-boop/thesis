import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Maximize2,
  RefreshCcw,
  Shield,
  FileImage,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
  fileName?: string;
}

export default function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  title = 'Document / ID Preview',
  subtitle = 'Official Submitted Identification Document',
  fileName = 'document-preview.png'
}: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom & rotation whenever a new image opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, imageUrl]);

  if (!imageUrl) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName || `document-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-700 text-white w-[96vw] max-w-5xl h-[92vh] max-h-[95vh] p-0 flex flex-col overflow-hidden shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400 font-medium">
                {subtitle}
              </DialogDescription>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </Button>
            <span className="text-[10px] font-mono text-slate-400 w-10 text-center select-none font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </Button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              title="Reset View"
            >
              <RefreshCcw size={13} />
            </Button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 px-2 text-xs text-indigo-300 hover:text-white hover:bg-indigo-600/40 cursor-pointer gap-1"
              title="Download Original"
            >
              <Download size={13} />
              <span className="hidden sm:inline text-[11px]">Download</span>
            </Button>
          </div>
        </div>

        {/* Image Canvas Viewport */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-radial from-slate-900 to-slate-950 relative select-none">
          <div className="relative flex items-center justify-center transition-transform duration-200 ease-out"
               style={{
                 transform: `scale(${zoom}) rotate(${rotation}deg)`,
                 transformOrigin: 'center center'
               }}>
            <img
              src={imageUrl}
              alt={title}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-2xl border border-slate-800/80 pointer-events-auto"
            />
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px]">Auto-fitted responsive preview • Click tools above to zoom, rotate, or download</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-7 text-xs bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
