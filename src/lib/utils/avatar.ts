export const getAvatarUrl = (userId: string | undefined) => {
  if (!userId) return 'https://api.dicebear.com/7.x/avataaars/svg?seed=?&backgroundColor=b6e3f4';
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}&backgroundColor=b6e3f4,c0aede,d1d4f9&mouth=smile,twinkle,default&eyes=happy,wink,default&hair=long,short,pixie,dreads,fancy,bob`;
}; 