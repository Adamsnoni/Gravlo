# Multi-Unit Building Support

## Overview

LeaseEase now supports **multi-unit buildings** where landlords can manage multiple apartments within a single building. Each apartment has a unique identifier (unit number, floor) that appears throughout the platform to ensure tenants and landlords always know which specific unit they're working with.

## Property Model

Each property can now include:

- **`buildingName`** (optional): Name of the building/complex (e.g., "Sunset Apartments")
- **`unitNumber`** (optional): Unique unit identifier (e.g., "4B", "101", "A-12")
- **`floor`** (optional): Floor number (numeric)

These fields are optional and can be used independently:
- Standalone properties: No building/unit fields needed
- Multi-unit building: Use `buildingName` + `unitNumber` (and optionally `floor`)

## Display Format

Unit identifiers are formatted consistently:

- **Short format**: "Unit 4B" or "Unit 4B, Floor 2"
- **Full format**: "Sunset Apartments - Unit 4B - Floor 2"

## Where Unit Info Appears

### Landlord Views

1. **Properties Page** (`/properties`)
   - Property cards show unit number badge (if set)
   - Building filter dropdown (when properties have building names)
   - Search includes unit numbers

2. **Property Detail Page** (`/properties/:id`)
   - Hero section shows full unit identifier prominently
   - Property Details card shows Building and Unit rows (if set)

3. **Payments Page** (`/payments`)
   - Payment rows show unit info in parentheses when available
   - All payments are tied to the specific unit

### Tenant Views

1. **My Homes** (`/tenant`)
   - Each home card shows unit identifier badge
   - Clear identification of which apartment they're viewing

2. **Payments** (`/tenant/payments`)
   - Payment dropdown shows: "Property Name - Unit 4B — Amount"
   - Payment rows show unit info
   - Invoices include full unit details

3. **Reminders** (`/tenant/reminders`)
   - Reminders are linked to specific properties (which include unit info)

## Invoices

PDF invoices automatically include:
- Building name (if set)
- Unit number (if set)
- Floor (if set)
- Full property address

Example invoice shows:
```
Apartment Details:
Sunset Apartments
Sunset Apartments - Unit 4B - Floor 2
123 Main Street
Type: Apartment
2 bedroom(s) · 1 bathroom(s) · 1200 sqft
```

## Payment Backend Integration

When your payment backend writes payment documents to Firestore, include these fields for proper unit tracking:

```javascript
{
  // ... existing payment fields ...
  propertyBuildingName: property.buildingName || '',
  propertyUnitNumber: property.unitNumber || '',
  propertyFloor: property.floor || '',
  propertyAddress: property.address || '',
  // ... other property fields ...
}
```

This ensures:
- Payment records are permanently tied to the correct unit
- Invoices show accurate unit information
- Tenants see their specific unit in payment history
- Landlords can filter/search by building/unit

## Data Flow

1. **Landlord creates property** → Sets building name, unit number, floor (optional)
2. **Landlord assigns tenant** → Tenant email linked to that specific unit
3. **Tenant logs in** → Sees only their assigned unit(s) with clear unit identifiers
4. **Tenant makes payment** → Payment includes unit info in checkout session
5. **Backend records payment** → Writes payment doc with unit fields
6. **Invoice generated** → PDF includes full unit details
7. **All views** → Consistently show unit info to avoid confusion

## Best Practices

- **Use consistent unit numbering**: "4B" vs "4-B" vs "4B" — pick one format per building
- **Include building name** for multi-unit buildings to avoid confusion across properties
- **Floor is optional** but helpful for large buildings
- **Unit number is the key identifier** — make it unique and clear
