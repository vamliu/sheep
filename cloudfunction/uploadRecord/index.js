// 云函数入口文件
const cloud = require('wx-server-sdk')

// 与小程序端一致，均需调用 init 方法初始化
cloud.init({
  // API 调用都保持和云函数当前所在环境一致
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 可在入口函数外缓存 db 对象
const db = cloud.database()

// 云函数入口函数
exports.main = async (event) => {

  const { OPENID: openid } = cloud.getWXContext()
  const docId = `${openid}-record`
  let userRecord

  try {
    const querResult = await db.collection('record').doc(docId).get()
    userRecord = querResult.data
  } catch(err) {
    // 用户第一次上传分数
  }

  if (userRecord) {
    const records = userRecord.records
    const RECORD_SIZE = 20
    records.unshift(event)
    if(records.length > RECORD_SIZE){
      records.pop()
    }
    const updateResult = await db.collection('record').doc(docId).update({
      data: {
        records
      }
    })

    if (updateResult.stats.updated === 0) {
      // 没有更新成功，更新数为 0
      return {
        success: false
      }
    }

    return {
      success: true,
      updated: true
    }

  } else {
    // 创建新的用户记录
    await db.collection('record').add({
      // data 是将要被插入到 score 集合的 JSON 对象
      data: {
        // 这里指定了 _id，如果不指定，数据库会默认生成一个
        _id: docId,
        // 这里指定了 _openid，因在云函数端创建的记录不会默认插入用户 openid，如果是在小程序端创建的记录，会默认插入 _openid 字段
        _openid: openid,
        // 记录历史
        records: [event]
      }
    })

    return {
      success: true,
      created: true
    }
  }
}
