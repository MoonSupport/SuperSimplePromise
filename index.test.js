const SSPromise = require("./index.js")
const DEFAULT_VALUE = "DEFAULT_VALUE"

describe("then을 호출한다.", () => {
  it("then을 호출하면 resolve 결과를 리턴한다.",async () => {
    return buildPromise().then((v)=> expect(v).toBe(DEFAULT_VALUE))
  })

  it("지연 시간이 있을 때, then이 resolve 결과를 리턴한다.", async () => {
    return new SSPromise((resolve) => {
      setTimeout(()=> {
        resolve(DEFAULT_VALUE)
      },1)
    }).then((v)=> expect(v).toBe(DEFAULT_VALUE))
  })


  it("같은 프라미스에서 여러개의 then을 호출 하면 resolve 결과를 리턴한다.", async () => {
    const parentPromise = buildPromise()
    const promise1 = parentPromise.then((v)=> expect(v).toEqual(DEFAULT_VALUE))
    const promise2 = parentPromise.then((v)=> expect(v).toEqual(DEFAULT_VALUE))
    return Promise.allSettled([promise1, promise2])
  })

  it("then결과를 체이닝하여 호출할 수 있다.", () => {
    return buildPromise({ value: 1 })
      .then(v => v + 1)
      .then(v => expect(v).toEqual(2))
  })
})

describe("catch를 호출한다.", () => {
  it("catch를 호출하면 reject결과를 얻는다.", () => {
    return buildPromise({ isReject: true }).catch(v => expect(v).toEqual(DEFAULT_VALUE))
  })

  it("with 같은 프라미스 내에서 여러개의 reject의 결과를 얻는다.", () => {
    const parentPromise = buildPromise({ isReject: true })
    const promise1 = parentPromise.catch((v)=> expect(v).toEqual(DEFAULT_VALUE))
    const promise2 = parentPromise.catch((v)=> expect(v).toEqual(DEFAULT_VALUE))
    return Promise.allSettled([promise1, promise2])
  })

  it("Promise callback내에서 예외 발생시에 reject의 결과를 얻는다.", ()=> {
    return new Promise(()=>{
      throw DEFAULT_VALUE
    }).catch((v)=> expect(v).toBe(DEFAULT_VALUE))
  })

  it("then에서 예외 발생시 catch를 체이닝으로 호출하여 결과를 얻을 수 있다.", () => {
    return buildPromise({ value: 3 })
      .then(v => {
        throw v * 4
      })
      .catch(v => expect(v).toEqual(12))
  })
})

describe("finally", () => {
  it("finally는 fulfill 혹은 reject 상태에서 항상 호출할 수 있다.", async () => {
    const ALL_CALLBACK_CALL_COUNT = 2;
    let runningCallbackCount = 0;
    try{
      await buildPromise().finally(()=> runningCallbackCount++);
      await buildPromise({ isReject: true }).finally(()=> runningCallbackCount++);
    }catch(e) {}
    finally {
      expect(runningCallbackCount).toBe(ALL_CALLBACK_CALL_COUNT);
    }

  })

  it("같은 프라미스에서 내에서 여러개의 finally를 호출 할 수 있다.", async () => {
    const ALL_CALLBACK_CALL_COUNT = 2;
    let runningCallbackCount = 0;

    const parentPromise = buildPromise()
    await parentPromise.finally(() => runningCallbackCount++)
    await parentPromise.finally(() => runningCallbackCount++)

    expect(runningCallbackCount).toBe(ALL_CALLBACK_CALL_COUNT);
  })

  it("then 혹은 catch 이후에 finally로 체이닝할 수 있다.", async () => {
    const ALL_CALLBACK_CALL_COUNT = 2;
    let runningCallbackCount = 0;

    await buildPromise().then(v => v).finally(()=> runningCallbackCount++)
    await buildPromise({ isReject: true }).catch(v => v).finally(()=>runningCallbackCount++)
    
    expect(runningCallbackCount).toBe(ALL_CALLBACK_CALL_COUNT);
  })
})

describe("static methods", () => {
  describe("resolve", () => {
    it("성공 값을 반환한다.", ()=> {
      return SSPromise.resolve(DEFAULT_VALUE).then(v =>
        expect(v).toEqual(DEFAULT_VALUE)
      )
    })
  })

  describe("reject", () => {
    it("실패 값을 반환한다.", ()=> {
      return SSPromise.reject(DEFAULT_VALUE).catch(v =>
        expect(v).toEqual(DEFAULT_VALUE)
      )
    })
  })

  describe("all", () => {
    it("모든 Promise가 성공하고 결과로 배열에 값들이 담겨진다.", () => {
      return SSPromise.all([buildPromise({ value: 1 }), buildPromise({ value: 2 })]).then(
        v => expect(v).toEqual([1, 2])
      )
    })

    it("Promise중 일부가 실패하고 실패 값이 반환된다.", () => {
      return SSPromise.all([buildPromise(), buildPromise({ isReject: true })]).catch(v =>
        expect(v).toEqual(DEFAULT_VALUE)
      )
    })
  })

  describe("allSettled", () => {
    it("Promise 중 일부는 성공하고 일부는 실패한다. 각각의 결과가 배열에 상태와 값 객체로 반환된다.", ()=> {
      return SSPromise.allSettled([buildPromise(), buildPromise({ isReject: true })]).then(v =>
        expect(v).toEqual([
          { status: "fulfilled", value: DEFAULT_VALUE },
          { status: "rejected", value: DEFAULT_VALUE },
        ])
      )
    })
  })

  describe("race", () => {
    it("Promise 중 가장 빠른 결과 값을 반환한다.", () => {
      const promise1 = new SSPromise((resolve)=> {
        setTimeout(()=> {
          resolve(1)
        }, 500)
      })
      const promise2 = new SSPromise((resolve)=> {
        setTimeout(()=> {
          resolve(2)
        }, 100)
      })

      return SSPromise.race([
        promise1,
        promise2,
      ]).then(v => expect(v).toEqual(2))
    })

    it("모든 Promise 중 가장 빠른 실패를 반환한다.", () => {
      const promise1 = new SSPromise((_, reject)=> {
        setTimeout(()=> {
          reject(1)
        }, 500)
      })
      const promise2 = new SSPromise((_, reject)=> {
        setTimeout(()=> {
          reject(2)
        }, 100)
      })

      return SSPromise.race([
        promise1,
        promise2
      ]).catch(v => expect(v).toEqual(2))
    })
  })

  describe("any", () => {
    it("모든 Promise가 성공 하고 이 때, 가장 빠른 결과를 반환한다.", () => {
      return SSPromise.any([buildPromise({ value: 1 }), buildPromise({ value: 2 })]).then(
        v => expect(v).toEqual(1)
      )
    })

    it("모든 Promise가 실패 하고 에러 및 에러 값을 반환한다.", () => {
      return SSPromise.any([
        buildPromise({ isReject: true, value: 1 }),
        buildPromise({ isReject: true, value: 2 }),
      ]).catch(e => expect(e.errors).toEqual([1, 2]))
    })

    it("Promise 중 일부만 성공 하고, 가장 빠른 성공된 결과를 반환한다.", () => {
      return SSPromise.any([
        buildPromise({ isReject: true, value: 1 }),
        buildPromise({ value: 2 }),
      ]).then((v)=> expect(v).toBe(2))
      .catch(e => { throw e })
    })
  })
})

function buildPromise({ value = DEFAULT_VALUE, isReject = false } = {}) {
  return new SSPromise((resolve, reject) => {
    isReject ? reject(value) : resolve(value)
  })
}