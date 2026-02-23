// src/utils/unitDisplay.js
// Utility functions for displaying unit identifiers in multi-unit buildings

/**
 * Format a unit identifier for display
 * Examples:
 * - "Unit 4B" (unitNumber only)
 * - "Unit 4B, Floor 2" (unitNumber + floor)
 * - "Sunset Apartments - Unit 4B" (buildingName + unitNumber)
 * - "Sunset Apartments - Unit 4B, Floor 2" (all fields)
 */
export function formatUnitDisplay(property) {
  if (!property) return '';
  
  const parts = [];
  
  if (property.buildingName) {
    parts.push(property.buildingName);
  }
  
  if (property.unitNumber) {
    parts.push(`Unit ${property.unitNumber}`);
  }
  
  if (property.floor != null && property.floor !== '') {
    parts.push(`Floor ${property.floor}`);
  }
  
  if (parts.length === 0) {
    return property.name || '';
  }
  
  return parts.join(' - ');
}

/**
 * Get a short unit identifier (just unit number and floor if available)
 */
export function getShortUnitId(property) {
  if (!property) return '';
  
  const parts = [];
  
  if (property.unitNumber) {
    parts.push(`Unit ${property.unitNumber}`);
  }
  
  if (property.floor != null && property.floor !== '') {
    parts.push(`Floor ${property.floor}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : property.name || '';
}

/**
 * Get full unit identifier with building name
 */
export function getFullUnitId(property) {
  return formatUnitDisplay(property);
}

/**
 * Check if a property is part of a multi-unit building
 */
export function isMultiUnitBuilding(property) {
  return !!(property?.buildingName || property?.unitNumber);
}
