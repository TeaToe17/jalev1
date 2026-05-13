# Product System Redesign - Implementation Guide

**Status:** Code Preview (No Deployment / No Migrations)

All code has been written and is ready for review in the preview files. Nothing has been committed to git or migrated to the database.

---

## Preview Files Location

All new code is available in these preview files (you can open in your editor):

### Backend Files
1. **`/backend/product/models_preview.py`** - New database models
   - ProductVariant
   - ProductImage
   - ProductReview
   - ProductDiscount

2. **`/backend/product/services_preview.py`** - Business logic services
   - ProductQueryService (filtering & search)
   - PricingService (discount calculations)
   - ReviewService (rating aggregation)

3. **`/backend/product/serializers_preview.py`** - API serializers
   - ProductVariantSerializer
   - ProductImageSerializer
   - ProductReviewSerializer
   - ProductDiscountSerializer
   - ProductListSerializer
   - ProductDetailSerializer

### Frontend Files
4. **`/frontend/src/components/COMPONENT_PREVIEWS.tsx`** - New components
   - VariantSelector
   - FilterBar
   - ReviewsList

### Documentation
5. **`/CODE_PREVIEW_CHANGES.md`** - Complete code preview with all implementations

---

## What Was Changed (Preview Only)

### New Database Models (4 models)

```
Product (existing)
├── ProductVariant (NEW) - SKU-level pricing
├── ProductImage (NEW) - Product gallery
├── ProductReview (NEW) - Customer reviews
└── ProductDiscount (NEW) - Time-based pricing
```

### API Endpoints (New)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/products/list/?search=...&priceMin=...` | Advanced search |
| GET/POST | `/api/variants/` | Manage variants |
| GET/POST | `/api/reviews/` | Manage reviews |
| GET | `/api/reviews/summary/?product_id=1` | Get rating summary |
| GET/POST | `/api/images/` | Manage images |
| PATCH | `/api/images/set_primary/` | Set primary image |
| GET | `/api/products/detail/<id>/` | Detailed product view |

### Frontend Components (3 components)

1. **VariantSelector** - Dropdown for variant selection
   - Shows price and stock per variant
   - Single selection
   - Click to select

2. **FilterBar** - Advanced search interface
   - Text search
   - Price range
   - Condition (new/used)
   - Minimum rating
   - Sort options

3. **ReviewsList** - Review display & management
   - Rating summary with distribution
   - Individual reviews
   - Verified purchase badge
   - Helpful count

---

## Implementation Steps (When Ready)

Follow these steps **ONLY when you're ready to deploy**:

### Step 1: Copy Preview Files to Actual Files

```bash
# Backend models
cp backend/product/models_preview.py backend/product/models_new.py

# Backend services  
cp backend/product/services_preview.py backend/product/services.py

# Backend serializers
cp backend/product/serializers_preview.py backend/product/serializers_new.py

# Frontend components
cp frontend/src/components/COMPONENT_PREVIEWS.tsx frontend/src/components/variants/VariantSelector.tsx
cp frontend/src/components/COMPONENT_PREVIEWS.tsx frontend/src/components/filters/FilterBar.tsx
cp frontend/src/components/COMPONENT_PREVIEWS.tsx frontend/src/components/reviews/ReviewsList.tsx
```

### Step 2: Update Existing Files

Merge the new models into `backend/product/models.py`:
- Add the 4 new model classes
- Update CartItem to add `variant` field
- Update Order to add `variant` field

Merge the new serializers into `backend/product/serializers.py`:
- Add all new serializer classes
- Update ProductListView to use new serializer

Merge the new endpoints into `backend/product/views.py`:
- Add ProductVariantViewSet
- Add ProductReviewViewSet
- Add ProductImageViewSet
- Add ProductDetailView

Update `backend/product/urls.py`:
- Register router for new viewsets
- Add ProductDetailView endpoint

### Step 3: Create Migrations

```bash
cd backend
python manage.py makemigrations product order
python manage.py migrate
```

### Step 4: Update Frontend

Import and use the new components in your pages:

```tsx
import { VariantSelector } from '@/components/VariantSelector'
import { FilterBar } from '@/components/FilterBar'
import { ReviewsList } from '@/components/ReviewsList'
```

### Step 5: Test

1. Test variant selection in product detail page
2. Test filtering in product list page
3. Test review creation and display
4. Test discount calculations

### Step 6: Deploy

Once all tests pass:

```bash
git add .
git commit -m "feat: implement product system redesign"
git push origin product-system-redesign
# Create PR and merge
```

---

## Database Schema

### ProductVariant
```sql
Fields:
- id (PK)
- product_id (FK) -> Product
- name (varchar)
- sku (varchar, unique)
- price (decimal)
- stock (integer)
- attributes (json)
- is_active (boolean)
- created (timestamp)
- updated (timestamp)

Indexes:
- (product_id, is_active)
- (sku)
```

### ProductImage
```sql
Fields:
- id (PK)
- product_id (FK) -> Product
- imagefile (file)
- image_url (url)
- alt_text (varchar)
- is_primary (boolean)
- order (integer)
- created (timestamp)

Index:
- (product_id, is_primary)
```

### ProductReview
```sql
Fields:
- id (PK)
- product_id (FK) -> Product
- reviewer_id (FK) -> User
- rating (integer, 1-5)
- title (varchar)
- comment (text)
- helpful_count (integer)
- is_verified_purchase (boolean)
- created (timestamp)
- updated (timestamp)

Unique:
- (product_id, reviewer_id)

Indexes:
- (product_id, rating)
- (created)
```

### ProductDiscount
```sql
Fields:
- id (PK)
- product_id (FK) -> Product
- variant_id (FK) -> ProductVariant (nullable)
- discount_type (varchar) - 'percentage' or 'fixed'
- value (decimal)
- description (varchar)
- start_date (timestamp)
- end_date (timestamp)
- is_active (boolean)
- created (timestamp)

Indexes:
- (product_id, is_active)
- (start_date, end_date)
```

---

## API Examples

### Get Products with Filtering

```bash
GET /api/products/list/?search=shirt&priceMin=5000&priceMax=10000&min_rating=4&sort_by=rating
```

Response:
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "name": "Premium Cotton Shirt",
      "owner_username": "seller1",
      "price": 7500,
      "price_range": {"min": 7500, "max": 8500},
      "average_rating": 4.5,
      "variants": [
        {
          "id": 10,
          "name": "Red - Size M",
          "sku": "SHIRT-RED-M",
          "price": 7500,
          "stock": 25,
          "attributes": {"color": "red", "size": "M"}
        }
      ],
      "primary_image": {
        "id": 5,
        "image_url": "https://...",
        "alt_text": "Front view"
      }
    }
  ]
}
```

### Get Product Details

```bash
GET /api/products/detail/1/
```

Response includes:
- All product info
- All variants
- All reviews (with reviewer info)
- All images
- Active discounts
- Price info

### Create Review

```bash
POST /api/reviews/
{
  "product": 1,
  "rating": 5,
  "title": "Excellent quality!",
  "comment": "Arrived quickly and product is exactly as described."
}
```

### Get Rating Summary

```bash
GET /api/reviews/summary/?product_id=1
```

Response:
```json
{
  "average_rating": 4.3,
  "total_reviews": 12,
  "rating_breakdown": {
    "5": 8,
    "4": 3,
    "3": 1,
    "2": 0,
    "1": 0
  }
}
```

---

## Feature Highlights

### ✓ Product Variants
- Multiple SKUs per product
- Individual pricing for each variant
- Individual stock tracking
- Flexible attributes (color, size, etc.)
- Variant selection in UI

### ✓ Pricing with Discounts
- Percentage discounts (e.g., 20% off)
- Fixed amount discounts (e.g., ₦5000 off)
- Time-based activation
- Per-variant or product-wide discounts
- Automatic price calculations

### ✓ Customer Reviews
- 1-5 star ratings
- Verified purchase badges
- One review per user per product
- Helpful count tracking
- Rating aggregation

### ✓ Advanced Search
- Full-text search
- Price range filtering
- Category filtering
- Rating-based filtering
- Condition filtering (new/used)
- Multiple sort options

### ✓ Product Gallery
- Multiple images per product
- Primary image selection
- Custom ordering
- External URL support (Cloudinary, AWS S3)
- Alt text for accessibility

---

## Performance Considerations

### Database Indexes
All new models have indexes on frequently queried fields:
- Product + Variant lookups
- Rating aggregations
- Discount date ranges

### Caching Strategies (Optional)
Consider caching for:
- Product ratings (invalidate on new review)
- Price ranges (invalidate on discount change)
- Search results (time-based expiry)

### Query Optimization
Use `select_related()` and `prefetch_related()`:
```python
# Get products with variants and ratings
products = Product.objects.prefetch_related(
    'variants',
    'reviews',
    'images',
    'discounts'
)
```

---

## Testing Checklist

Before deploying:

- [ ] Variants can be created and selected
- [ ] Prices update correctly with discounts
- [ ] Image upload and primary selection works
- [ ] Reviews can be created and displayed
- [ ] Rating aggregation is accurate
- [ ] Advanced search filters work
- [ ] Performance is acceptable with real data
- [ ] API responses are correct
- [ ] Frontend components render properly

---

## Rollback Plan

If something goes wrong after deployment:

```bash
# Rollback code
git revert <commit-hash>
git push

# Rollback database
python manage.py migrate product <target-migration>
```

---

## Questions?

Review the preview files:
1. `CODE_PREVIEW_CHANGES.md` - Complete code reference
2. `models_preview.py` - Database models
3. `services_preview.py` - Business logic
4. `serializers_preview.py` - API serializers
5. `COMPONENT_PREVIEWS.tsx` - Frontend components

**Status:** Ready to implement whenever you approve!
