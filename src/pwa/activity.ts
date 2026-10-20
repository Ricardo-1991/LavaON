let writes = 0;
let dirty = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export function subscribeActivity(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getActivity() {
  return `${writes}:${dirty}`;
}
export function hasPendingWrites() {
  return writes > 0;
}
export function hasUnsavedChanges() {
  return dirty;
}
export function markFormDirty() {
  if (
    /^\/(onboarding|services\/(new|[^/]+)|settings\/(account|establishment|operating))\/?$/.test(
      window.location.pathname,
    )
  ) {
    dirty = true;
    emit();
  }
}
export function clearFormDirty() {
  dirty = false;
  emit();
}
export function beginWrite() {
  writes++;
  emit();
  return () => {
    writes--;
    emit();
  };
}
