'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn, Play } from 'lucide-react';
import { isPlaceholderImage } from '@/lib/pharma/medicine-image';
import { ProductVisual } from '@/components/products/ProductVisual';

interface ProductImage {
  url: string;
  publicId?: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  videoUrl?: string;
  /** Dosage form — used for the designed tile when there is no real photo. */
  form?: string;
  /** Category — tints the designed tile. */
  category?: string;
}

export default function ProductImageGallery({
  images,
  productName,
  videoUrl,
  form,
  category,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Keep only genuine photos — generated placeholders are treated as "no photo".
  const imageUrls = images
    .map((img) => (typeof img === 'string' ? img : img.url))
    .filter((url) => !isPlaceholderImage(url));

  // When the product has no real photo, show a designed tile (ProductVisual)
  // instead of a repeated stock photo, so the page never shows an empty frame.
  const hasRealImages = imageUrls.length > 0;
  const currentImage: string | undefined = hasRealImages ? imageUrls[selectedIndex] : undefined;

  // Check if videoUrl is a YouTube link
  const isYouTube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="space-y-4">
      {/* Main Image / Video */}
      <div className="group relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-feature)]">
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
        ) : hasRealImages ? (
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
              className="absolute right-4 top-4 rounded-full bg-[var(--paper-card)] p-2 opacity-0 shadow-[var(--shadow-md)] transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100"
              aria-label="Zoom image"
            >
              <ZoomIn className="h-5 w-5 text-[var(--ink)]" />
            </button>
          </>
        ) : (
          <ProductVisual
            imageUrl={null}
            form={form}
            category={category}
            name={productName}
            fit="contain"
            priority
          />
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
                  ? 'ring-2 ring-[var(--ink)] shadow-lg scale-105'
                  : 'ring-1 ring-[var(--foil-soft)] hover:ring-[var(--ink)]'
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
                  ? 'ring-2 ring-[var(--ink)] shadow-lg scale-105'
                  : 'ring-1 ring-[var(--foil-soft)] hover:ring-[var(--ink)]'
              }`}
            >
              <div className="w-full h-full bg-[var(--ink)] flex flex-col items-center justify-center">
                <Play className="w-8 h-8 text-[var(--paper-card)] mb-1" />
                <span className="text-[var(--paper-card)] text-xs font-medium">Video</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && !showVideo && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-[var(--paper-card)] rounded-full hover:bg-[var(--foil-soft)] transition-colors"
          >
            <X className="w-6 h-6 text-[var(--ink)]" />
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
                      ? 'bg-[var(--ink)] w-8'
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
