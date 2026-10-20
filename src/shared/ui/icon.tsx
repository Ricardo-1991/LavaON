import {
  add,
  alertCircleOutline,
  businessOutline,
  calendarClearOutline,
  calendarOutline,
  callOutline,
  carOutline,
  cashOutline,
  checkmarkCircleOutline,
  chevronBack,
  chevronForward,
  homeOutline,
  personOutline,
  resizeOutline,
  searchOutline,
  settingsOutline,
  timeOutline,
  water,
  waterOutline,
} from 'ionicons/icons';

const icons = {
  add: add,
  'alert-circle-outline': alertCircleOutline,
  'business-outline': businessOutline,
  'calendar-clear-outline': calendarClearOutline,
  'calendar-outline': calendarOutline,
  'call-outline': callOutline,
  'car-outline': carOutline,
  'cash-outline': cashOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'chevron-back': chevronBack,
  'chevron-forward': chevronForward,
  'home-outline': homeOutline,
  'person-outline': personOutline,
  'resize-outline': resizeOutline,
  'search-outline': searchOutline,
  'settings-outline': settingsOutline,
  'time-outline': timeOutline,
  water: water,
  'water-outline': waterOutline,
} as const;
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 20,
  color = 'currentColor',
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const source = icons[name];
  const svg = source.startsWith('data:')
    ? decodeURIComponent(source.slice(source.indexOf(',') + 1))
    : source;
  return (
    <span
      aria-hidden="true"
      className="icon"
      style={{ width: size, height: size, color }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
