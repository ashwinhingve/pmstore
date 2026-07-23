'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn, Play } from 'lucide-react';

interface ProductImage {
  url: string;
  publicId?: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  videoUrl?: string;
}

export default function ProductImageGallery({
  images,
  productName,
  videoUrl,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const imageUrls = images.map((img) => (typeof img === 'string' ? img : img.url));

  if (imageUrls.length === 0 && !videoUrl) {
    return (
      <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center">
        <p className="text-gray-400">No images available</p>
      </div>
    );
  }

  const currentImage = imageUrls[selectedIndex];

  // Check if videoUrl is a YouTube link
  const isYouTube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="space-y-4">
      {/* Main Image / Video */}
      <div className="relative aspect-square bg-white rounded-2xl shadow-xl overflow-hidden group">
        {showVideo && videoUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {isYouTube ? (
              <iframe
                src={getYouTubeEmbedUrl(videoUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${productName} video`}
              />
            ) : (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        ) : (
          <>
            {currentImage && (
              <Image
                src={currentImage}
                alt={`${productName} - Image ${selectedIndex + 1}`}
                fill
                className="object-contain p-4"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={selectedIndex === 0}
              />
            )}

            {/* Zoom Button */}
            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Grid */}
      {(imageUrls.length > 1 || videoUrl) && (
        <div className="grid grid-cols-4 gap-3">
          {imageUrls.map((url, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedIndex(index);
                setShowVideo(false);
              }}
              className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                selectedIndex === index && !showVideo
                  ? 'ring-2 ring-amber-600 shadow-lg scale-105'
                  : 'ring-1 ring-gray-200 hover:ring-amber-400'
              }`}
            >
              <Image
                src={url}
                alt={`${productName} - Thumbnail ${index + 1}`}
                fill
                className="object-contain p-2"
                sizes="(max-width: 1024px) 25vw, 12.5vw"
              />
            </button>
          ))}

          {/* Video Thumbnail */}
          {videoUrl && (
            <button
              onClick={() => setShowVideo(true)}
              className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                showVideo
                  ? 'ring-2 ring-amber-600 shadow-lg scale-105'
                  : 'ring-1 ring-gray-200 hover:ring-amber-400'
              }`}
            >
              <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center">
                <Play className="w-8 h-8 text-white mb-1" />
                <span className="text-white text-xs font-medium">Video</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && !showVideo && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>

          <div className="relative w-full max-w-5xl aspect-square">
            <Image
              src={currentImage}
              alt={`${productName} - Full size`}
              fill
              className="object-contain"
              sizes="100vw"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Thumbnail Navigation in Lightbox */}
          {imageUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {imageUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(index);
                  }}
                  className={`w-3 h-3 rounded-full transition-all ${
                    selectedIndex === index
                      ? 'bg-amber-500 w-8'
                      : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
