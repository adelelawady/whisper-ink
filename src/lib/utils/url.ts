export const getBaseUrl = () => {
  const basename = import.meta.env.DEV ? '' : '/whisper-ink';
  return `${window.location.origin}${basename}`;
}; 