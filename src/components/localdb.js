import React, { useState, useEffect } from 'react';
import { Button, message, Progress, Drawer, Divider, Timeline } from 'antd';
import { CloudSyncOutlined, SmileOutlined } from '@ant-design/icons';

function Localdb() {

    // 重构后的更新按钮收纳到Drawer里
    const [open, setOpen] = useState(false);
    const showDrawer = () => {
        setOpen(true);
    };
    const onClose = () => {
        setOpen(false);
    };

    // 全局通知
    const [messageApi, contextHolder] = message.useMessage();
    const success = () => {
        messageApi.open({
            type: 'success',
            content: '更新数据库成功',
        });
    };

    // Progress + useState
    const [progressVisible, setProgressVisible] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressHint, setProgressHint] = useState("初始化");
    const [amll_ver, setAmllver] = useState("{\"time_ver\":\"本地无数据\"}");
    const [db_count, setDbCount] = useState("本地无数据");
    const [button_disabled, setButtondisabled] = useState(false);
    var storedMusicDataString;
    var storedMusicData;

    useEffect(() => {
        var storedMusicDataStringEffect;
        var storedMusicDataEffect;
        storedMusicDataStringEffect = localStorage.getItem('amlldata');
        console.log("[localdb]初始化, localdb版本:20240513d");
        if (storedMusicDataStringEffect === null || storedMusicDataStringEffect.length === 0) {
            //本地无数据时,使用.
            storedMusicDataStringEffect = "{\"time_ver\":\"本地无数据或数据损坏\"}";
            storedMusicDataEffect = JSON.parse(storedMusicDataStringEffect);
            setAmllver(storedMusicDataEffect.time_ver);
            setDbCount(0);
            console.log("[localdb]本地无数据或数据损坏");
        } else {
            //本地有数据时,使用[0]查询第一个数据的ver
            storedMusicDataEffect = JSON.parse(storedMusicDataStringEffect);
            setAmllver(storedMusicDataEffect[0].time_ver);
            setDbCount(storedMusicDataEffect.length);
            console.log("[localdb]检测到本地数据 版本" + storedMusicDataEffect[0].time_ver + " 共" + storedMusicDataEffect.length + "条");
        }
    }, []); // 空的依赖项数组，表示副作用只在组件挂载和卸载时执行

    const updateData = () => {
        function fetchData() {
            //禁用button
            setButtondisabled(true);
            // Progress
            setProgressVisible(true);
            setProgressPercent(10);
            setProgressHint("[1/4]联系Github API");
            // 获取数据
            // 从GithubAPI获取数据
            var amll_data = [];
            var amll_issue_data = [];
            var maplength = 0;

            fetch('https://api.github.com/repos/Steve-xmh/amll-ttml-db/git/trees/main?recursive=1')
                .then(res => res.json())
                .then(async data => {
                    maplength = data.tree.length;
                    console.log("[localdb]注意: Github API对于每个IP地址进行了请求频率限制, 为60次/1h, 请勿高频请求");
                    console.log("[localdb]Get Github Git Trees from API, DataLength:" + maplength);
                    const tree = data.tree;
                    // 过滤出需要的文件
                    const ttmlFiles = tree.filter(file => file.path.endsWith('.ttml') && file.path.startsWith('ncm-lyrics/'));

                    // TODO: 歌词作者
                    await fetchAllPages();
                    async function fetchAllPages() {
                        try {
                            var amll_issues = [];
                            var p = 0;
                            while (true) {
                                p++;
                                const response = await fetch('https://api.github.com/repos/Steve-xmh/amll-ttml-db/pulls?state=closed&per_page=100&page=' + p);
                                const data = await response.json();
                                // if (p == 2) {
                                //     break;
                                // }
                                if (data.length === 0) {
                                    break;
                                }
                                console.log("[localdb]Get Github PRs History from API, Page:" + p);
                                console.log(data);
                                amll_issues.push(data);
                                var j = 0;
                                while (true) {
                                    if (j + 1 === data.length) {
                                        break;
                                    } else if (!data[j].body) {
                                        data[j].body = "null";
                                    } else if (data[j].merged_at) {
                                        let authorMatch = data[j].body.match(/歌词作者\n(@\S+)\n/);
                                        let author = authorMatch ? authorMatch[1] : null;

                                        let start = data[j].body.indexOf('### 歌曲关联网易云音乐 ID');
                                        let end = data[j].body.indexOf('###', start + 1);
                                        let section = data[j].body.slice(start, end);
                                        let regex = /`(\d+)`/g;
                                        let match;

                                        if (section) {
                                            //新版bot
                                            while ((match = regex.exec(section)) !== null) {
                                                const newIssueData = { ttml_time: data[j].created_at, ttml_author: author, song_id: match[1] };
                                                amll_issue_data.push(newIssueData);
                                            }
                                        } else {
                                            //旧版bot
                                            start = data[j].body.indexOf('### 歌词关联歌曲 ID');
                                            end = data[j].body.indexOf('###', start + 1);
                                            section = data[j].body.slice(start, end);
                                            if (section) {
                                                while ((match = regex.exec(section)) !== null) {
                                                    const newIssueData = { ttml_time: data[j].created_at, ttml_author: author, song_id: match[1] };
                                                    amll_issue_data.push(newIssueData);
                                                }
                                            } else {
                                                //远古时期Pr
                                                console.log("[localdb]无法获取歌曲关联id, 匹配文件更改记录失败, 可能为早期Pulls \ntitle:", data[j].title, "\nurl:", data[j].html_url, "\ncreated_at:", data[j].created_at);
                                                // console.log(data[j].body);
                                            }
                                        }
                                    }
                                    j++;
                                }
                            }
                            console.log("[localdb]Get Github PRs History from API - Fininshed");
                            console.log(amll_issue_data);
                        } catch (error) {
                            console.error('[localdb]fetch出现故障, 可能需要启用代理或清除localstorage数据', error);
                            // 处理错误...
                        }
                    }


                    console.log("[localdb]匹配歌曲信息, 联系163api");
                    // 输出id

                    const BATCH_SIZE = 400;
                    const batches = [];
                    for (let start = 0; start < ttmlFiles.length; start += BATCH_SIZE) {
                        batches.push(ttmlFiles.slice(start, start + BATCH_SIZE));
                    }

                    let i = 0;
                    for (const batch of batches) {
                        // eslint-disable-next-line no-loop-func
                        const batchPromises = batch.map(async file => {
                            const fileName = file.path.split('/')[1];  // 获取文件名
                            const ttmlid = fileName.split('.')[0];  // 移除扩展名
                            const ttml_id = ttmlid;
                            const ttml_url = 'https://github.com/Steve-xmh/amll-ttml-db/blob/main/ncm-lyrics/' + ttmlid + '.ttml';
                            const ttml_downurl = "https://mirror.ghproxy.com/https://raw.githubusercontent.com/Steve-xmh/amll-ttml-db/main/ncm-lyrics/" + ttmlid + '.ttml'; //ghproxy 避免raw.gh被ban
                            const time_ver = new Date().toLocaleString();

                            // 从网易云API获取数据
                            try {
                                if (i === 0) {
                                    setProgressPercent(30);
                                    setProgressHint("[2/4]准备匹配歌曲信息");
                                }

                                const response = await fetch('https://163.ink2link.cn/song/detail?ids=' + ttml_id);
                                const data = await response.json();
                                const s_name = data?.songs?.[0]?.name;
                                const s_sname = data?.songs?.[0]?.ar[0].name;
                                const s_pic = data?.songs?.[0]?.al.picUrl;
                                const response_1 = await fetch('https://163.ink2link.cn/song/url/v1?id=' + ttml_id + '&level=standard');
                                const data_1 = await response_1.json();

                                // 部分无版权歌曲统一替换url
                                // console.log(i ,"获取歌曲url" , data_1.data[0].url)
                                if (data_1.data[0].url == null) {
                                    console.log("序列位置:", i, "歌曲url获取错误,可能为VIP歌曲或版权失效, data:", data_1.data[0].url)
                                    data_1.data[0].url = 'http://www.baidu.com';
                                }
                                const s_downurl = data_1.data[0].url.replace(/^http:/, "https:");
                                var ttml_author = [];
                                async function matchTTMLAuthor() {
                                    var k = 0;
                                    while (true) {
                                        if (k + 1 === amll_issue_data.length) {
                                            break;
                                        }
                                        if (ttml_id === amll_issue_data[k].song_id) {
                                            const author_info = { ttml_ver: amll_issue_data[k].ttml_time, ttml_author: amll_issue_data[k].ttml_author }
                                            ttml_author.push(author_info)
                                            // console.log(ttml_id)
                                            // console.log(ttml_author)
                                        }
                                        k++;
                                    }
                                }
                                await matchTTMLAuthor();
                                const newData = {
                                    s_id: ttml_id,
                                    s_name: s_name,
                                    s_sname: s_sname,
                                    s_pic: s_pic,
                                    s_downurl: s_downurl,
                                    ttml_url: ttml_url,
                                    ttml_downurl: ttml_downurl,
                                    time_ver: time_ver,
                                    ttml_info: ttml_author
                                };
                                amll_data.push(newData);

                            } catch (error) {
                                console.error('[localdb]fetch出现故障, 可能需要启用代理或清除localstorage数据', error);
                                // 处理错误...
                            } finally {
                                i++;
                            }

                            // if (i == Math.ceil(maplength / 4)) {
                            var j = i * 6;
                            var k = j / maplength;
                            setProgressPercent(k * 248);
                            setProgressHint("[3/4]匹配文件信息, 第" + i + "条");
                            // }else if(i == Math.ceil(maplength / 3)){
                            //     setProgressPercent(50);
                            //     setProgressHint("匹配文件信息, 第" + i + "条");
                            // }
                        });
                        await Promise.all(batchPromises);
                        if (batches.length > 1 && batch !== batches[batches.length - 1]) {
                            await new Promise(res => setTimeout(res, 100));
                        }
                    }

                    // 所有异步请求完成后执行这里的代码
                    setProgressPercent(80);
                    setProgressHint("[4/4]存储数据");
                    // 存储到 localStorage
                    console.log("[localdb]已存储至localstorage");
                    localStorage.setItem('amlldata', JSON.stringify(amll_data));

                    // 1. 清空存储的数据
                    storedMusicDataString = '';
                    storedMusicData = [];
                    // 2. 获取数据（异步部分）
                    // 3. 从本地存储获取数据
                    storedMusicDataString = localStorage.getItem('amlldata');
                    storedMusicData = JSON.parse(storedMusicDataString);
                    // 4. 更新状态 +歌词总数
                    console.log("[localdb]通过useState钩子更新视图数据");
                    setAmllver(storedMusicData[0]?.time_ver);
                    setDbCount(storedMusicData.length);

                    setProgressPercent(90);
                    setProgressHint("更新视图");
                    // 触发自定义事件localstorageDataChanged
                    window.dispatchEvent(new Event('localstorageDataChanged'));
                    // 启用button
                    setProgressPercent(100);
                    setProgressHint("更新完成");
                    setProgressVisible(false);
                    setButtondisabled(false);
                    success();
                    console.log("更新数据库完成:");
                    console.log(amll_data);
                }).catch(err => console.error(err));
        }
        fetchData();
    }

    return (
        <>
            {contextHolder}
            <Button
                type="text"
                icon={<CloudSyncOutlined />}
                onClick={showDrawer}
                style={{
                    fontSize: '16px',
                    width: 64,
                    height: 64,
                }}
            />
            <Drawer title="数据库更新" onClose={onClose} open={open}>
                <Button type="text" onClick={() => updateData()} disabled={button_disabled}>数据库版本: {amll_ver} &nbsp; 歌词数: {db_count}</Button>
                <br />
                <Button type="primary" onClick={() => updateData()} disabled={button_disabled} block> 更新</Button>
                {progressVisible && (
                    <Button type="text" block>
                        <Progress
                            type="circle"
                            trailColor="#e6f4ff"
                            percent={progressPercent}
                            strokeWidth={20}
                            size={14}
                            format={(number) => `进行中，已完成${number}%`}
                        />
                        <span
                            style={{
                                marginLeft: 8,
                            }}
                        >
                            {progressHint}
                        </span>
                    </Button>
                )}
                <Divider orientation="left" plain>
                    Search In AMLL DB 更新日志
                </Divider>
                <Timeline
                    items={[
                        {
                            color: 'green',
                            children: (
                                <>
                                    <p><b>24.0.0</b> - 2024/5/29</p>
                                    <p>AMLL 3.1.0, React 0.1.5, Core 0.1.3</p>
                                    <p> - Add  player control bar</p>
                                </>
                            ),
                        },
                        {
                            color: 'gray',
                            children: (
                                <>
                                    <p><b>23.0.0</b> - 2024/5/12</p>
                                    <p>AMLL 3.1.0, React 0.1.5, Core 0.1.3</p>
                                    <p> - Add  ttml changing infomations</p>
                                    <p> - Add  ttml creator informations</p>
                                </>
                            ),
                        },
                        {
                            color: 'gray',
                            children: (
                                <>
                                    <p><b>22.0.0</b> - 2024/5/11</p>
                                    <p>AMLL 3.1.0, React 0.1.5, Core 0.1.3</p>
                                    <p> - Add     player and test area</p>
                                    <p> - Update  database button's style</p>
                                    <p> - Prepare mobile devices optimization</p>
                                    <p> - Fix     wrong database count</p>
                                </>
                            ),
                        },
                        {
                            color: 'gray',
                            children: (
                                <>
                                    <p><b>21.0.0</b> - 2024/5/7</p>
                                    <p>AMLL 3.1.0, React 0.1.5, Core 0.1.3</p>
                                    <p> - Fix github api limits</p>
                                    <p> - Add 163api setting</p>
                                </>
                            ),
                        },
                        {
                            color: '#00CCFF',
                            dot: <SmileOutlined />,
                            children: <p>Old updating logs are unavailable.</p>,
                        },
                    ]}
                />
            </Drawer>
        </>
    );
}

export default Localdb;
