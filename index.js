/**
 * Promise는 비동기적으로 처리 될 수 있는 callback함수를
 * 객체 내부의 Context에서 실행하는 것
 * 
 * callback의 리턴 값은 resolve에
 * 에러에 대한 결과는 reject에 인자로 넘겨 반환한다.
 * Promise 내부에서 값을 저장하고 있다가, then을 통해서
 * 비동기의 결과값을 반환한다. 
 */

 const STATE = {
    FULFILLED : 'fulfilled',
    PENDING : 'pending',
    REJECTED: 'rejected',
}

class Queue {
    #arr = [];
    push(value) {
        this.#arr.push(value)
    }

    pop() {
        this.#arr.shift()
    }

    top() {
        return this.#arr[0];
    }

    isEmpty() {
        return this.#arr.length == 0;
    }
}


class SSPromise {
    #state = STATE.PENDING
    #value
    #resolveBind = this.#resolve.bind(this)
    #rejectBind = this.#reject.bind(this)
    #thenCallbacks = new Queue()
    #catchCallbacks = new Queue()

    constructor(callback) {
        try{
            callback(this.#resolveBind, this.#rejectBind)
        }catch(error) {
            this.#reject(error);
        }
    }

    #runCallbacks() {
        if(this.#state === STATE.FULFILLED) {
            while(!this.#thenCallbacks.isEmpty()) {
                this.#thenCallbacks.top()(this.#value);
                this.#thenCallbacks.pop();
            }
        }

        if(this.#state === STATE.REJECTED) {
            while(!this.#catchCallbacks.isEmpty()) {
                this.#catchCallbacks.top()(this.#value);
                this.#catchCallbacks.pop();
            }
        }
    }

    #resolve(value) {
            queueMicrotask(()=> {
                if(this.#state !== STATE.PENDING) return 
                
                this.#state = STATE.FULFILLED
                this.#value = value
                this.#runCallbacks();
            })
    }

    #reject(value) {
        queueMicrotask(()=> {
            if(this.#state !== STATE.PENDING) return 

            this.#state = STATE.REJECTED
            this.#value = value
            this.#runCallbacks();
        })
    }

    then(thenCallback, catchCallback) {
        return new SSPromise((resolve, reject) => {
            this.#thenCallbacks.push((result)=> {
                if(!thenCallback) {
                    resolve(result);
                    return;
                }

                try{
                    resolve(thenCallback(result));
                }catch(error) {
                    reject(error)
                }
            });

            this.#catchCallbacks.push((result)=> {
                if(!catchCallback) {
                    reject(result);
                    return;
                }
                
                try{
                    resolve(catchCallback(result));
                }catch(error) {
                    reject(error)
                }
            })

            this.#runCallbacks();
        })
    }

    catch(catchCallback) {
        return this.then(undefined, catchCallback);
    }

    finally(cb) {
        return this.then((result)=>{
            cb();
            return result;
        }, (result)=>{
            cb();
            throw result;
        })
    }

    static resolve(value) {
        return new SSPromise((resolve)=> {
            resolve(value)
        })
    }

    static reject(value) {
        return new SSPromise((_, reject)=> {
            reject(value)
        })
    }

    static all(promises) {
        const results = [];
        let settledPromiseCount = 0;
        return new SSPromise((resolve, reject) => {
            for(let i =0; i<promises.length; i++) {
                const promise =  promises[i];
                promise.then((v)=> {
                    results[i] = v;
                    settledPromiseCount++;
                    if(settledPromiseCount == promises.length) {
                        resolve(results);
                    }
                }).catch(reject)
            }
        })
    }

    static allSettled(promises) {
        const results = [];
        let settledPromiseCount = 0;
        return new SSPromise((resolve) => {
            for(let i =0; i<promises.length; i++) {
                const promise =  promises[i];
                promise
                .then((v)=> results[i] = {status: STATE.FULFILLED, value: v})
                .catch((v)=> results[i] = {status: STATE.REJECTED, value: v})
                .finally(()=> {
                    settledPromiseCount++;
                    if(settledPromiseCount == promises.length) {
                        resolve(results);
                    }
                })
            }
        })
    }

    static race(promises) {
        return new SSPromise((resolve, reject) => {
            promises.map((promise)=> {
                promise.then(resolve).catch(reject);
            })
        })
    }

    static any(promises) {
        const errors = [];
        let rejectedPromiseCount = 0;
        return new SSPromise((resolve, reject)=> {
            for(let i=0; i<promises.length; i++) {
                const promise = promises[i];
                promise.then(resolve)
                .catch((e)=> {
                    rejectedPromiseCount++;
                    errors[i] = e;
                    if(rejectedPromiseCount == promises.length) {
                        reject(new AggregateError(errors, "All promises were rejected"));
                    }
                })
            }
        })
    }
}


module.exports = SSPromise;

