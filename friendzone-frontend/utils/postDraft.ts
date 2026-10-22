let published = false;

export const markPostPublished = () => {
  published = true;
};

export const consumePostPublished = () => {
  const value = published;
  published = false;
  return value;
};
