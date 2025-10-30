
import React from 'react';
import DownloadIcon from './icons/DownloadIcon';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, onClose }) => {
  const handleDownload = async () => {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gemini-creative-suite-image.${blob.type.split('/')[1] || 'png'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to download image:", error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Generated Content"
          className="object-contain max-w-full max-h-[90vh] rounded-lg shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-component-bg text-text-primary rounded-full p-2 hover:bg-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={handleDownload}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-accent-khaki text-white rounded-full p-3 hover:bg-opacity-90 transition-opacity flex items-center gap-2"
          aria-label="Download Image"
        >
          <DownloadIcon className="w-6 h-6" />
          <span className="font-semibold">Download</span>
        </button>
      </div>
    </div>
  );
};

export default ImageViewer;
   