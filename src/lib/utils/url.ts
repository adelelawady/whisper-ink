export const getBaseUrl = () => {
  /** ANDROID - IOS */
  const originAndroidProduction = 'https://adelelawady.github.io/whisper-ink';
  const basenameAndroid = import.meta.env.DEV ? '' : '';


  /** WEB */
  const origin = window.location.origin;
  const basename = import.meta.env.DEV ? '' : '/whisper-ink';
  return `${origin}${basename}/#`;
}; 