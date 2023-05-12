// siri.js
// 引入必要的库
import cloud from '@lafjs/cloud';
const { v4: uuidv4 } = require('uuid');

// 创建数据库连接
const db = cloud.database();
const ChatTable = db.collection('siri')


// 设置key和模型
const OPENAI_KEY = process.env.OPENAI_KEY || "YOUR API-Key";


export async function main(params, context) {
  console.log('siri入参:', params);
  const { question, cid } = params.body;

  // 创建一个id
  const chatId = cid ? cid : uuidv4();

  // 获取上下文 id
  const chats = await ChatTable.where({
    chatId
  }).orderBy("createdAt", "desc").getOne();

  console.log("获取上下文", chats)

  const parentId = chats?.data?.parentMessageId

  const { ChatGPTAPI } = await import('chatgpt')
  let api = cloud.shared.get('api')
  if (!api) {
    api = new ChatGPTAPI({ apiKey: OPENAI_KEY })
    cloud.shared.set('api', api)
  }

  try {

    // 如果有上下文 id，就带上
    let res;

    if (parentId) {
      res = await api.sendMessage(question, { parentMessageId: parentId })
    } else {
      res = await api.sendMessage(question)
    }
    console.log("res", res)
    const responseMessage = res.detail.choices[0].message;

    // 保存返回结果
    await ChatTable.add({ chatId, ...responseMessage, parentMessageId: res.parentMessageId });

    // 返回结果
    return { reply: responseMessage.content, cid: chatId };

  } catch (error) {
    // 打印错误日志
    console.log('error', error);
    if (error.statusCode === 429) {
      return {
        error: '问题太多了，我有点眩晕，请稍后再试'
      }
    }
    return {
      error: "问题太难了 出错了. (uДu〃).",
    }
  }
};


