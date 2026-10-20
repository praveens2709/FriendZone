type Listener = (postId: string) => void;

const listeners = new Set<Listener>();

export const emitPostRemoved = (postId: string) => {
  listeners.forEach((listener) => listener(postId));
};

export const onPostRemoved = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
