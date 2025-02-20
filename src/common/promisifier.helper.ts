import { ResultWithError } from './interfaces';

/**
 * Wraps a Promise that returns a ResultWithError into a standard Promise
 * @param req Promise that resolves to a ResultWithError object
 * @returns Promise that resolves to the data or rejects with the error
 *
 * This helper function:
 * 1. Takes a Promise that resolves to a {data, error} structure
 * 2. Unwraps the result to handle the error checking
 * 3. If there's an error, rejects the promise with the error
 * 4. If successful, resolves the promise with just the data
 *
 * This allows converting API responses that use a Result pattern
 * into standard Promise success/error handling.
 *
 * Example usage:
 * ```
 * // Instead of:
 * const {data, error} = await apiCall();
 * if (error) handleError(error);
 * useData(data);
 *
 * // You can write:
 * const data = await Promisify(apiCall());
 * useData(data);
 * // Any errors will be thrown and can be caught normally
 * ```
 */
export function Promisify<T>(req: Promise<ResultWithError>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const { data: result, error } = await req;
      if (error) throw error;

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}
