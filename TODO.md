* 修改index.html里面的具体的前5个repo的描述
* 网页上方的icon要换成github的icon（就是浏览器标签页里面的icon）
* 优化跳转逻辑（在repo里面新增一些点击后可以返回主页的链接）

Documents页面逻辑：
* 正文部分通关读取`./documents`里面的`.md`文件，自动转成成html格式（这样方便我编辑！）
* （可能需要读取coockies以查询玩家解锁进度？）
* 输对了密码的文档可以查看（不要求一定要按顺序解锁！）

## 优化页面跳转逻辑

### index.html

没啥要改的

## repo.html

* 点击导航栏上面的"cute_little_rabbit_baby"可以返回到主页（index.html）；

* 点击任意一个头像可以返回到主页（index.html）；

## documents.html

* 点击导航栏上面的"cute_little_rabbit_baby"可以返回到主页（index.html）；
* 
* 点击导航栏上面的"secret"可以返回到secret 仓库（repo.html）；
