'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Star, ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface Review {
  id: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  images: string[];
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
  autoOpenReview?: boolean;
}

interface UploadedImage {
  url: string;
  uploading: boolean;
  error?: string;
}

function StarRating({
  rating,
  size = 'sm',
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: 'sm' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'lg' ? 'w-7 h-7' : 'w-4 h-4';

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${sizeClass} ${
              star <= (hovered || rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const MAX_IMAGES = 3;

export default function ProductReviews({ productId, autoOpenReview }: ProductReviewsProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState([0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review form
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  // Auto-open form when arriving via review link (?review=1)
  useEffect(() => {
    if (autoOpenReview && session && !loading) {
      setShowForm(true);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [autoOpenReview, session, loading]);

  async function fetchReviews() {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setTotalReviews(data.totalReviews || 0);
      setAverageRating(data.averageRating || 0);
      setRatingDistribution(data.ratingDistribution || [0, 0, 0, 0, 0]);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - uploadedImages.filter((i) => !i.error).length;
    const toUpload = files.slice(0, remaining);

    // Add placeholders
    const placeholders: UploadedImage[] = toUpload.map(() => ({ url: '', uploading: true }));
    setUploadedImages((prev) => [...prev, ...placeholders]);

    const startIndex = uploadedImages.length;

    await Promise.all(
      toUpload.map(async (file, i) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch('/api/reviews/upload-image', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || 'Upload failed');

          setUploadedImages((prev) => {
            const next = [...prev];
            next[startIndex + i] = { url: data.url, uploading: false };
            return next;
          });
        } catch (err: any) {
          setUploadedImages((prev) => {
            const next = [...prev];
            next[startIndex + i] = { url: '', uploading: false, error: err.message };
            return next;
          });
        }
      })
    );

    // Reset input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(index: number) {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (formRating === 0) {
      setFormError('Please select a rating');
      return;
    }
    if (formComment.trim().length < 10) {
      setFormError('Review must be at least 10 characters');
      return;
    }
    if (uploadedImages.some((img) => img.uploading)) {
      setFormError('Please wait for images to finish uploading');
      return;
    }

    const imageUrls = uploadedImages.filter((img) => img.url && !img.error).map((img) => img.url);

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: formRating,
          title: formTitle,
          comment: formComment,
          images: imageUrls,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setFormSuccess(true);
      setShowForm(false);
      setFormRating(0);
      setFormTitle('');
      setFormComment('');
      setUploadedImages([]);
      fetchReviews();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const validImageCount = uploadedImages.filter((i) => !i.error).length;
  const canAddMore = validImageCount < MAX_IMAGES;

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-gray-500">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="text-center sm:text-left">
          <div className="text-5xl font-bold text-gray-900">{averageRating || '—'}</div>
          <StarRating rating={Math.round(averageRating)} />
          <p className="text-sm text-gray-500 mt-1">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDistribution[star - 1] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-gray-600">{star}</span>
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write Review Button */}
      {!showForm && !formSuccess && (
        <div ref={formRef}>
          {session ? (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800"
            >
              Write a Review
            </Button>
          ) : (
            <p className="text-sm text-gray-500">
              <a href="/login" className="text-amber-600 hover:underline">
                Sign in
              </a>{' '}
              to write a review
            </p>
          )}
        </div>
      )}

      {formSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">Your review has been submitted successfully!</p>
        </div>
      )}

      {/* Review Form */}
      {showForm && (
        <form
          onSubmit={handleSubmitReview}
          className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200"
        >
          <h4 className="font-semibold text-gray-900">Write Your Review</h4>

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating *
            </label>
            <StarRating
              rating={formRating}
              size="lg"
              interactive
              onRate={setFormRating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review *
            </label>
            <textarea
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder="What did you like or dislike about this product?"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
              minLength={10}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formComment.length}/10 characters minimum
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (optional, up to {MAX_IMAGES})
            </label>

            <div className="flex flex-wrap gap-3">
              {/* Uploaded image thumbnails */}
              {uploadedImages.map((img, i) => (
                <div
                  key={i}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0"
                >
                  {img.uploading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                    </div>
                  ) : img.error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1">
                      <X className="w-5 h-5 text-red-500" />
                      <span className="text-xs text-red-500 text-center leading-tight mt-0.5">
                        Failed
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(img.url)}
                      className="w-full h-full"
                    >
                      <Image
                        src={img.url}
                        alt={`Review photo ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}

              {/* Add photo button */}
              {canAddMore && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-amber-500 hover:bg-amber-50 flex flex-col items-center justify-center gap-1 transition-colors flex-shrink-0"
                >
                  <ImagePlus className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-400">Add photo</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              JPG, PNG or WebP — max 5MB each
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting || uploadedImages.some((img) => img.uploading)}
              className="bg-gradient-to-r from-amber-600 to-red-700"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setFormError(null);
                setUploadedImages([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-gray-500 italic py-4">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-gray-200 pb-4 last:border-0"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    {review.title && (
                      <span className="font-medium text-gray-900">
                        {review.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">{review.userName}</span>
                    {review.isVerifiedPurchase && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        Verified Purchase
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-2">{review.comment}</p>

              {/* Review images */}
              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {review.images.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxUrl(url)}
                      className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity flex-shrink-0"
                    >
                      <Image
                        src={url}
                        alt={`Review image ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div
            className="relative max-w-2xl max-h-[80vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightboxUrl}
              alt="Review photo"
              width={800}
              height={800}
              className="object-contain rounded-lg max-h-[80vh] w-auto mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
