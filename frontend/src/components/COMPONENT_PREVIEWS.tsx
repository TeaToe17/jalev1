/**
 * PREVIEW FILE - New Frontend Components for Product System Redesign
 * (This is a preview - not yet in production)
 *
 * Three new components to add to the frontend:
 * 1. VariantSelector - Dropdown for selecting product variants
 * 2. FilterBar - Advanced search and filtering
 * 3. ReviewsList - Display and manage reviews
 */

// ============================================================================
// COMPONENT 1: VariantSelector
// ============================================================================
/**
 * VariantSelector.tsx
 * 
 * Allows customers to select variant with different price/stock.
 * 
 * Usage:
 * <VariantSelector
 *   variants={product.variants}
 *   onSelectVariant={handleVariantSelect}
 *   selectedVariant={currentVariant}
 * />
 */

import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Variant {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  is_active: boolean;
}

interface VariantSelectorProps {
  variants: Variant[];
  onSelectVariant: (variant: Variant) => void;
  selectedVariant: Variant | null;
}

export function VariantSelector({
  variants,
  onSelectVariant,
  selectedVariant,
}: VariantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeVariants = variants.filter(v => v.is_active);

  return (
    <div className="w-full space-y-2">
      <label className="block text-sm font-semibold text-gray-900">
        Select Variant
      </label>
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex flex-col">
            <span className="text-gray-900 font-medium">
              {selectedVariant ? selectedVariant.name : 'Choose variant...'}
            </span>
            {selectedVariant && (
              <span className="text-sm text-gray-600">
                ₦{selectedVariant.price.toLocaleString()} • 
                {selectedVariant.stock > 0 ? ' In Stock' : ' Out of Stock'}
              </span>
            )}
          </div>
          <ChevronDown 
            size={20} 
            className={`transition-transform ${isOpen ? 'rotate-180' : ''} text-gray-500`} 
          />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            {activeVariants.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No variants available</div>
            ) : (
              activeVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => {
                    onSelectVariant(variant);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left border-b border-gray-200 last:border-b-0 hover:bg-gray-50 flex items-start justify-between group ${
                    selectedVariant?.id === variant.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold text-gray-900">{variant.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      SKU: {variant.sku}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      ₦{variant.price.toLocaleString()} 
                      {variant.stock > 0 ? ` • ${variant.stock} in stock` : ' • Out of Stock'}
                    </div>
                  </div>
                  {selectedVariant?.id === variant.id && (
                    <Check size={20} className="text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================================
// COMPONENT 2: FilterBar
// ============================================================================
/**
 * FilterBar.tsx
 * 
 * Advanced search and filtering for product listings.
 * 
 * Usage:
 * <FilterBar onFilterChange={handleFilterChange} />
 */

import { Search, X, Sliders } from 'lucide-react';

interface FilterBarProps {
  onFilterChange: (filters: {
    search?: string;
    priceMin?: number;
    priceMax?: number;
    condition?: 'new' | 'used';
    minRating?: number;
    sortBy?: string;
  }) => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [condition, setCondition] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('created');

  const handleApply = () => {
    onFilterChange({
      search: search || undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      condition: (condition as 'new' | 'used') || undefined,
      minRating: minRating ? Number(minRating) : undefined,
      sortBy,
    });
  };

  const handleClear = () => {
    setSearch('');
    setPriceMin('');
    setPriceMax('');
    setCondition('');
    setMinRating('');
    setSortBy('created');
    onFilterChange({});
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
      </div>

      {/* Expandable Filter Section */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
      >
        <Sliders size={18} />
        <span className="font-medium">Advanced Filters</span>
      </button>

      {isExpanded && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Price (₦)
              </label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price (₦)
              </label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="999,999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Conditions</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Rating
            </label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Any Rating</option>
              <option value="1">1★ and up</option>
              <option value="2">2★ and up</option>
              <option value="3">3★ and up</option>
              <option value="4">4★ and up</option>
              <option value="5">5★ only</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="created">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleApply}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-medium flex items-center justify-center gap-2"
            >
              <X size={18} />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// COMPONENT 3: ReviewsList
// ============================================================================
/**
 * ReviewsList.tsx
 * 
 * Display product reviews with rating summary.
 * 
 * Usage:
 * <ReviewsList reviews={product.reviews} productId={product.id} />
 */

import { Star, MessageCircle, ThumbsUp } from 'lucide-react';

interface Review {
  id: number;
  reviewer_username: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  created: string;
  helpful_count: number;
}

interface ReviewsListProps {
  reviews: Review[];
  productId: number;
  onAddReview?: () => void;
}

export function ReviewsList({ reviews, productId, onAddReview }: ReviewsListProps) {
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0';

  const ratingCounts = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  return (
    <div className="w-full space-y-6">
      {/* Rating Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Reviews</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Average Rating */}
          <div className="text-center md:border-r md:border-gray-300">
            <div className="text-4xl font-bold text-gray-900">{averageRating}</div>
            <div className="flex justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < Math.round(Number(averageRating))
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }
                />
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2 font-medium">
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="col-span-1 md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 w-12 font-medium">{rating}★</span>
                <div className="flex-1 bg-gray-300 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{
                      width: reviews.length
                        ? `${(ratingCounts[rating as keyof typeof ratingCounts] / reviews.length) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
                <span className="text-sm text-gray-700 w-8 text-right font-medium">
                  {ratingCounts[rating as keyof typeof ratingCounts]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {onAddReview && (
          <button
            onClick={onAddReview}
            className="w-full mt-6 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} />
            Write a Review
          </button>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">All Reviews</h4>

        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <MessageCircle size={32} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-gray-900">{review.reviewer_username}</span>
                    {review.is_verified_purchase && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Review Title */}
                  {review.title && (
                    <h5 className="font-semibold text-gray-900 mb-1">{review.title}</h5>
                  )}

                  {/* Review Comment */}
                  <p className="text-gray-700 mb-3">{review.comment}</p>

                  {/* Date and Helpful */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{new Date(review.created).toLocaleDateString()}</span>
                    <button className="flex items-center gap-1 hover:text-blue-600">
                      <ThumbsUp size={14} />
                      {review.helpful_count > 0 && <span>{review.helpful_count}</span>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
