// siri.js
// 引入必要的库
import cloud from '@lafjs/cloud';
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// 创建数据库连接
const db = cloud.database();
const ChatTable = db.collection('siri')


// 设置key和模型
const OPENAI_KEY = process.env.OPENAI_KEY || "YOUR API-KEY";
const OPENAI_MODEL = process.env.MODEL || "gpt-3.5-turbo";
const MAX_MESSAGES_PER_CHAT = 40;


export async function main(params, context) {
  console.log('siri入参:', params);
  const { question, cid } = params.body;

  // 创建一个id
  const chatId = cid ? cid : uuidv4();

  // 保存用户问题
  await ChatTable.add({ chatId, role: 'user', content: question });

  // 获取历史信息
  const chats = await ChatTable
    .where({ chatId })
    .orderBy("createdAt", "desc").limit(MAX_MESSAGES_PER_CHAT).get();

  // 组装问题prompt
  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    ...chats.data.map(one => ({ role: one.role, content: one.content })),
  ];

  const data = JSON.stringify({
    model: OPENAI_MODEL,
    messages: messages
  });

  const config: any = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    data: data,
    timeout: 50000
  };

  try {
    // 发送请求
    const completion = await axios(config);

    const responseMessage = completion.data.choices[0].message;

    // 保存返回结果
    await ChatTable.add({ chatId, ...responseMessage });

    // 返回结果
    return { reply: responseMessage.content, cid: chatId };

  } catch (error) {
    // 打印错误日志
    console.log('error', error.response || error);


    let errorMessage;

    // 处理返回报错信息
    if (error.response) {
      const { status, statusText, data } = error.response;

      if (status === 401) {
        errorMessage = 'Unauthorized: Invalid OpenAI API key, please check your API key in the AirCode Environments tab.';
      } else if (data.error && data.error.message) {
        errorMessage = data.error.message;
      } else {
        errorMessage = `Request failed with status code ${status}: ${statusText}`;
      }
    } else if (error.request) {
      errorMessage = 'No response received from the server';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = `Network error: ${error.message}`;
    } else {
      errorMessage = `Request setup error: ${error.message}`;
    }
    return { error: errorMessage };
  }
};
