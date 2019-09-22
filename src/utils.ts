export function promiseFromCallback (fn: (callback: (err: Error, result: any) => void) => void): Promise<any> {
    return new Promise((resolve, reject) => {
        fn((err, result) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });
}