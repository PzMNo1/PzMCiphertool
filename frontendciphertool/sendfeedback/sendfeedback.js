function initSendFeedback() {
    // 渲染作者采访
    const interviewContainer = document.querySelector('#zuozhecaifang .container');
    if (interviewContainer) {
        interviewContainer.innerHTML = `
            <div class="card">
                <div class="badge">作者采访</div>
                <p>Q: 开发这个应用的团队有多少人<br>
                A: 目前只有作者一个人，你们看到的PzM，泡面的面，还有版权里的LiangJunHao，都是作者。 当然，我们期待大家能加入我们开发团队，为人类的未来助一份力。</p>
                <br>
                <p>Q：这个工具应用是用AI生成的吗？<br>
                A：10%是纯AI，40%是AI生成后作者手动打磨细节，50%是纯手动，你们看到的密码卡片的转换算法大部分是来自2024年年底的纯人工，那时候我们在尝试用最少的代码来转换密码。还有你们看到的比较科幻的样式，也是年初GPTo3或DeepSeek-R1生成几百个不同样式后作者调整细节花99%的时间打磨的。</p>
                <br>
                <p>Q：这个应用是什么时候开始做的？<br>
                A：源头来说是2024年9月开始，最初是个python脚本和GUI，后来换了很多语言和框架，重构了十几次代码，甚至有几次是全部删除重来的，目的是为了给早期开发者更好的体验，以及简化开发流程。</p>
                <br>
                <p>Q：我看到有些页面还没开发完？<br>
                A：是的，目前整体的开发进度还不到1%，甚至是0.1%，因为作者还有2000多个想法，但精力有限。我们欢迎你随时能够为本工具提供更多的支持。</p>
                <br>
                <p>Q：我记得不是今年九月上线吗，怎么年底才上线<br>
                A：作者临时加了几百个想法，为了能合并更多其它模块并更快上线，作者这三个月几乎天天通宵，通完宵还得回去上班，艰苦这个词已经不足以形容作者了。</p>

                <p>Q：不怕有人入侵你的服务器吗？<br>
                A：既然以及上线了，那么就已经做好了一些相关的防御措施，作者为了这个也是啃了很多书。当然我们也需要后端安全部署师来做维护，我们不看学历和工作经历，只需要向作者提交代码。</p>
                <br>
                <p>Q：作者用了多久的AI？<br>
                A：从22年底用GPT3开始，然后3.5，4.0，然后转到claude，和Gemini，Grok。开始是直接调用API，到后面R1开始尝试本地部署，然后再到深层一点的Transformer搭建，神经网络底层.....啃了不少论文和其它大神的成品，希望明年大家能看到作者原生训练搭建的模型。</p>
                <br>
                <p>Q：我看到好多人说他们之前体验过这个工具？<br>
                A：是的，这半年作者都在找不同的早期体验者，一开始是身边玩得好的朋友，然后逐渐转向其它庞大的群体，包括C9高校的部分学生和老师（集中在清北复交较多）、以及各大企业的一些中高层精英（大疆、美的、库卡、Tesla、华为），还有书记和委员，以及海外的华人精英（集中在华尔街、硅谷较多）。如果你们想要体验最新版本，欢迎随时联系作者。</p>
                <br>
                <p>Q：我没看到现代区MD5、SHA有解密？<br>
                A：作者查过这是属于违法行为，上线了会被黑白两头围剿。而且我们希望本工具更多的是用于学习和娱乐交流，不希望触碰真实的边界。</p>
                <br>
                <p>Q：什么时候会更新新的版本<br>
                A：目前还有几百个bug没修复，离新版本还有些时间。</p>

            </div>
        `;
    }

    // 渲染意见反馈
    const feedbackContainer = document.querySelector('#yijianfankui .container');
    if (feedbackContainer) {
        feedbackContainer.innerHTML = `
            <div class="card">
                <div class="badge">意见反馈</div>
                <div style="margin-top: 1rem;">
                    <textarea id="feedbackInput" placeholder="请输入您的意见或建议..." style="width: 100%; min-height: 200px; margin-bottom: 1rem;"></textarea>
                    <div style="display: flex; justify-content: flex-end;">
                        <button id="submitFeedbackBtn" class="cyber-button">
                            <span class="cyber-button__glitch"></span>
                            <span class="cyber-button__tag">发送反馈</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 绑定发送按钮事件
        const submitBtn = document.getElementById('submitFeedbackBtn');
        const feedbackInput = document.getElementById('feedbackInput');

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                const content = feedbackInput.value.trim();
                if (!content) {
                    alert('请输入反馈内容');
                    return;
                }
                
                // 模拟发送
                // 这里将来可以接入实际的后端接口
                console.log('Feedback submitted:', content);
                
                // 显示成功弹窗 (这里简单使用alert，或者后续可以改为更美观的自定义弹窗)
                alert('你的意见我们已收集，感谢你们的反馈');
                
                // 清空输入框
                feedbackInput.value = '';
            });
        }
    }
}
