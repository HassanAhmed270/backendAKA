// Picks the most useful message from a failed request or a thrown Error.
// - server answered: use its "message" (or the fallback)
// - no server answer (guest-cart rule, network problem): use the error's own text
export const getErrorMessage = (error, fallback) => {
  if (error?.response) {
    return error.response.data?.message || fallback;
  }
  return error?.message || fallback;
};