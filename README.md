### 三分钟把ChatGPT接入Siri，让你的语音助手化身智能AI
`最近`，各种各样使用`ChatGPT`的方式都出现了，但是有很多都需要在电脑操作，或者点击别人的各种各样的链接，而且有些可能还要魔法上网才能实现，这些都是稍微有点繁琐的。

`那么`，最方便的还是直接使用我们的手机一键打开或者语音唤醒就可以实现链接`ChatGPT`的，下边我们就来看下怎么实现吧！

#### 1. 效果展示
- 连续对话

![](https://files.mdnice.com/user/24883/aae93f71-0e4b-4873-83ea-960cd272e15f.png)


- 手动输入

![](https://files.mdnice.com/user/24883/722b0aa1-877b-4b44-bb42-8cb752491563.png)



#### 2. 云函数实现
我们仍然使用Laf云平台来实现，如何注册Laf和安装依赖，见上篇文章 [《使用Laf云平台，两步将ChatGPT接入微信公众号(含代码)》](https://mp.weixin.qq.com/s/1e0oZ9aPImnNq7yYvnLG5g)

- 创建Siri云函数

![创建云函数步骤](https://files.mdnice.com/user/24883/be03cd4a-91e5-4279-841f-f7b696441929.png)

```js
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
```
最新代码可见：https://github.com/husanr/siri_gpt_laf

#### 3. 添加快捷指令
- 打开以下链接，添加快捷指令。
https://www.icloud.com/shortcuts/6f550307e3724769b3e7fc493c07aae6
- 在打开的页面中点击`获取捷径`按钮，然后在弹出的窗口中点击`添加快捷指令`。
![](https://files.mdnice.com/user/24883/db39c0ff-12d4-4462-b15f-c1d42373bc8f.png)

![](https://files.mdnice.com/user/24883/f3201de2-df8f-49d0-9638-212895fb127d.png)

- 添加过之后，在快捷指令中找到刚添加打开机器人快捷指令，点击右上角三个点进入编辑页面，然后把上边发布的Siri云函数的地址复制粘贴到文本的位置，然后点击完成。

![](https://files.mdnice.com/user/24883/510e5b89-d2d6-4b45-8f6e-a029b78f8f8d.png)


![](https://files.mdnice.com/user/24883/c06ae2fb-4e56-459a-88e1-a7f43afb8163.png)


![](https://files.mdnice.com/user/24883/9f3a363c-1e5b-4c23-994b-0dac9f646671.png)

- 到此，语音助手设置完成，你可以通过语音`嘿 Siri，打开机器人` 唤醒带有ChatGPT的语音助手了，快去体验吧！
![](https://files.mdnice.com/user/24883/aae93f71-0e4b-4873-83ea-960cd272e15f.png)

- 如果你想要在手机主屏幕通过输入文字与ChatGPT交互，那么你可以把快捷指令添加到主屏幕，如下：

![](https://files.mdnice.com/user/24883/4f4b3fa1-5ac3-4c98-b57b-a260b44ed35e.png)

![](https://files.mdnice.com/user/24883/fde31fb3-bc21-4c95-80bd-893a89a14ce3.png)

![](https://files.mdnice.com/user/24883/722b0aa1-877b-4b44-bb42-8cb752491563.png)

#### 大功告成！

关注我的公众号，更多精彩内容等你来看！

![](https://files.mdnice.com/user/24883/c36d68a7-439f-4876-b44c-87ee93b680cc.png)




