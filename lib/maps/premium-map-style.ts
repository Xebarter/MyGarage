/** Ivory Google Maps JS style — matches the sunlit emerald/gold brand. */
export const PREMIUM_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#FFF6EA' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7A8B82' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFBF4' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#D8F3E6' }, { visibility: 'on' }],
  },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#ECDCC6' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FFFBF4' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F3E7C8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#D9C4A6' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#7A8B82' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B8DCC8' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4A5C54' }] },
];
