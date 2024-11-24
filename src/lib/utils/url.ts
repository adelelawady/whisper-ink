export const getBaseUrl = () => {
  const origin = window.location.origin;
  const basename = import.meta.env.DEV ? '' : '/whisper-ink';
  return `${origin}${basename}/#`;
}; 