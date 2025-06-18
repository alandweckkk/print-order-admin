# Database Schema Documentation

This document contains comprehensive information about the main Supabase tables used in the print order admin system.

## Project Information
- **Supabase Project ID**: `bdrzgznzjnpkheqfmqgd`
- **Project Name**: chibisticker.com
- **Region**: us-east-1

---

## Table Relationships Overview

```
anonymous_users (id) ←→ model_runs (user_id)
anonymous_users (id) ←→ physical_mail_orders (user_id)
anonymous_users (id) ←→ stripe_captured_events (user_id)
model_runs (id) ←→ physical_mail_orders (model_run_id)
model_runs (id) ←→ stripe_captured_events (model_run_id)
```

---

## 1. stripe_captured_events

**Purpose**: Captures Stripe webhook events for payment processing and tracking.

### Schema
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | No | AUTO INCREMENT | Primary key |
| `payload` | jsonb | Yes | - | Full Stripe webhook payload |
| `transaction_id` | text | Yes | - | Stripe transaction/charge ID |
| `amount` | numeric | Yes | - | Payment amount in dollars |
| `created_timestamp` | bigint | Yes | - | Unix timestamp from Stripe |
| `created_timestamp_est` | timestamp | Yes | - | EST converted timestamp |
| `payment_source` | text | Yes | - | Source of payment (e.g., "paywall_screen") |
| `user_id` | text | Yes | - | User identifier |
| `pack_type` | text | Yes | - | Type of purchase (e.g., "single") |
| `model_run_id` | text | Yes | - | Associated model run ID |
| `output_image_url` | text | Yes | - | Generated image URL |
| `credits` | text | Yes | - | Credit information |

### Key Features
- **RLS Enabled**: Yes
- **Size**: ~23 MB with 11,302 records
- **Contains**: Full Stripe webhook payloads with payment metadata
- **Relationships**: 
  - `user_id` → `anonymous_users.id` (text reference)
  - `model_run_id` → `model_runs.id` (text reference)
- **Backup Relationship**: `output_image_url` (text, present in ~90% of records) → can link to `model_runs.output_image_url[0]` and `physical_mail_orders.output_image_url`

### Sample Data Structure
```json
{
  "id": 104,
  "transaction_id": "ch_3RSr4PGLD4chrmhB1ICGJDCD",
  "amount": "2.99",
  "payment_source": "paywall_screen",
  "user_id": "2c050d9d-28f9-4374-b88a-2e8ab1f1817c",
  "pack_type": "single",
  "model_run_id": "d07b8430-c5b8-4667-9e3d-265dd17663a7",
  "payload": {
    "id": "evt_3RSr4PGLD4chrmhB13iYh4yY",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "amount": 299,
        "currency": "usd",
        "status": "succeeded"
      }
    }
  }
}
```

---

## 2. physical_mail_orders

**Purpose**: Manages physical sticker orders that get mailed to customers.

### Schema
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `payment_intent_id` | text | No | - | Stripe payment intent ID (unique) |
| `user_id` | uuid | Yes | - | FK to anonymous_users |
| `model_run_id` | uuid | Yes | - | FK to model_runs |
| `status` | text | No | 'confirmed' | Order status |
| `amount` | integer | No | - | Amount in cents |
| `currency` | text | No | 'usd' | Currency code |
| `shipping_address` | jsonb | No | - | Complete shipping address |
| `items` | jsonb | Yes | '[]' | Array of ordered items |
| `metadata` | jsonb | Yes | - | Additional order metadata |
| `order_type` | text | No | 'physical_mail' | Type of order |
| `output_image_url` | text | Yes | - | Generated sticker image URL |
| `email` | text | Yes | - | Customer email |
| `tracking_number` | text | Yes | - | Shipping tracking number |
| `shipped_at` | timestamptz | Yes | - | Shipping timestamp |
| `delivered_at` | timestamptz | Yes | - | Delivery timestamp |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |
| `order_number` | text | Yes | - | Unique order number (MM-XXXXXX) |

### Key Features
- **RLS Enabled**: Yes
- **Size**: ~296 kB with 66 records
- **Status Values**: confirmed, processing, shipped, delivered, cancelled
- **Foreign Keys**: 
  - `user_id` → `anonymous_users.id`
  - `model_run_id` → `model_runs.id`
- **Backup Relationships**: 
  - `order_number` (text, unique, format: MM-XXXXXX) → unique identifier for customer reference
  - `output_image_url` (text, present in 100% of records) → can link to `model_runs.output_image_url[0]` and `stripe_captured_events.output_image_url`

### Sample Shipping Address Structure
```json
{
  "city": "Bakersfield",
  "name": "Vanessa sanchez",
  "line1": "2516 Floral Dr",
  "line2": null,
  "state": "CA",
  "country": "US",
  "postal_code": "93305"
}
```

### Sample Items Structure
```json
[
  {
    "name": "3x Premium Stickers",
    "price": 799,
    "quantity": 3
  }
]
```

---

## 3. anonymous_users

**Purpose**: Tracks anonymous users and their attributes for analytics and user management.

### Schema
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `posthog_distinct_id` | text | Yes | - | PostHog analytics ID |
| `email` | varchar | Yes | - | User email address |
| `email_lists` | text[] | No | '{}' | Email marketing lists |
| `vip_pipeline` | boolean | No | false | VIP status flag |
| `admin` | boolean | Yes | false | Admin privileges |
| `abusing` | boolean | No | false | Abuse flag |
| `aquisition_url` | text | Yes | - | User acquisition URL |
| `category` | text | Yes | 'couples' | User category |

### Key Features
- **Size**: ~17 MB with 63,998 records
- **Category Values**: 'couples', 'pets'
- **Referenced By**: 
  - `model_runs.user_id`
  - `physical_mail_orders.user_id`
  - `stripe_captured_events.user_id`
- **Backup Relationship**: `posthog_distinct_id` (text, present in ~13% of records) → unique PostHog analytics identifier when available

### Sample Data
```json
{
  "id": "4b04b837-a169-45cb-bdb7-b510b4e2462a",
  "created_at": "2025-05-20T21:38:41.399136Z",
  "posthog_distinct_id": null,
  "email": null,
  "email_lists": [],
  "vip_pipeline": false,
  "admin": false,
  "abusing": false,
  "aquisition_url": "https://gensticker-rkaj6rz8o-golddust.vercel.app/",
  "category": "couples"
}
```

---

## 4. model_runs

**Purpose**: Tracks AI model executions for sticker generation with detailed metadata.

### Schema
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `created_at` | timestamptz | No | `timezone('utc', now())` | Creation timestamp |
| `input_image_url` | text | Yes | - | Input image URL |
| `output_image_url` | text[] | Yes | - | Generated image URLs array |
| `status` | text | No | 'started' | Processing status |
| `metadata` | jsonb | Yes | - | Generation metadata |
| `processing_time_ms` | integer | Yes | - | Processing time in milliseconds |
| `usage_openai` | jsonb | Yes | - | OpenAI usage statistics |
| `reaction` | text | Yes | - | User reaction to output |
| `comment` | text | Yes | - | User feedback comment |
| `email` | text | Yes | - | User email |
| `resolved` | boolean | Yes | - | Support resolution status |
| `user_id` | uuid | Yes | - | FK to anonymous_users |
| `purchased` | boolean | No | false | Purchase status |
| `share_link_view_count` | integer | Yes | 0 | Share link views |
| `gift_link_view_count` | integer | Yes | 0 | Gift link views |
| `feedback_notes` | text | Yes | - | Additional feedback |
| `payment_source` | varchar | Yes | - | Payment source identifier |
| `price_variant_group` | text | Yes | - | Pricing variant |
| `original_output_image_url` | text[] | Yes | - | Original pre-processed images |
| `stripe_transaction_id` | text | Yes | - | Associated Stripe transaction |

### Key Features
- **Size**: ~97 MB with 61,098 records
- **Status Values**: 'started', 'completed', 'failed'
- **Foreign Keys**: `user_id` → `anonymous_users.id`
- **Referenced By**: 
  - `physical_mail_orders.model_run_id`
  - `stripe_captured_events.model_run_id`
- **Backup Relationship**: `output_image_url` (text[], present in ~96% of records) → array of generated image URLs, typically contains 1 image but can have up to 6

### Sample Metadata Structure
```json
{
  "generated_at": "2025-05-27T22:46:12.831Z",
  "openai_parameters": {
    "n": 1,
    "size": "1024x1024",
    "model": "gpt-image-1",
    "prompt": "Your task is to generate an image..."
  },
  "third_party_processing": {
    "enabled": true,
    "endpoint": "https://production-post-processing.replit.app/process-image"
  }
}
```

### Sample Usage OpenAI Structure
```json
{
  "input_tokens": 1086,
  "total_tokens": 5246,
  "output_tokens": 4160,
  "input_tokens_details": {
    "text_tokens": 181,
    "image_tokens": 905
  }
}
```

---

## Common Query Patterns

### Get Orders with User and Model Info
```sql
SELECT 
  pmo.*,
  au.email as user_email,
  au.category as user_category,
  mr.status as model_status,
  mr.reaction
FROM physical_mail_orders pmo
LEFT JOIN anonymous_users au ON pmo.user_id = au.id
LEFT JOIN model_runs mr ON pmo.model_run_id = mr.id
WHERE pmo.status = 'confirmed'
ORDER BY pmo.created_at DESC;
```

### Get Revenue by Date
```sql
SELECT 
  DATE(created_timestamp_est) as date,
  COUNT(*) as transaction_count,
  SUM(amount::numeric) as total_revenue
FROM stripe_captured_events
WHERE created_timestamp_est >= '2025-01-01'
GROUP BY DATE(created_timestamp_est)
ORDER BY date DESC;
```

### Get User Activity Summary
```sql
SELECT 
  au.id,
  au.email,
  au.category,
  COUNT(mr.id) as total_generations,
  COUNT(CASE WHEN mr.purchased = true THEN 1 END) as purchases,
  COUNT(pmo.id) as physical_orders
FROM anonymous_users au
LEFT JOIN model_runs mr ON au.id = mr.user_id
LEFT JOIN physical_mail_orders pmo ON au.id = pmo.user_id
GROUP BY au.id, au.email, au.category
HAVING COUNT(mr.id) > 0
ORDER BY total_generations DESC;
```

---

## Notes for Development

1. **Physical Mail Orders**: All amounts are stored in cents (e.g., 799 = $7.99)
2. **Model Runs**: The `output_image_url` field is an array and may contain multiple images
3. **Stripe Events**: The `payload` field contains the complete webhook data for debugging
4. **User Tracking**: Use `posthog_distinct_id` for analytics correlation
5. **Order Numbers**: Follow format `MM-XXXXXX` for customer-facing order references

This documentation should be updated when schema changes occur or new tables are added to the system. 