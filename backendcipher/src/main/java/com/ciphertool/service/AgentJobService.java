package com.ciphertool.service;

import com.ciphertool.dto.AgentJobRequest;

import java.util.List;
import java.util.Map;

/**
 * 账号级后台任务服务：研报/深度研究（agent）、作图（image）、视频创作（video）。
 *
 * <p>任务的生命周期与浏览器解耦：页面关闭、刷新或换设备后任务继续执行，
 * 重新进入页面时通过 /api/agent-jobs/active 找到在跑的任务并回放状态。</p>
 */
public interface AgentJobService {

    /**
     * 提交任务并立即返回任务视图；真正的执行在后台线程/独立进程中完成。
     */
    Map<String, Object> submit(String account, String authorization, AgentJobRequest request);

    /**
     * 查询任务。after 是客户端已收到的事件序号；knownContentVersion 是客户端已渲染的正文版本。
     */
    Map<String, Object> get(String account, String jobId, long after, long knownContentVersion, boolean includeResult);

    /**
     * 当前账号仍在运行、或已结束但客户端尚未认领的任务，用于重新进入网页时恢复现场。
     */
    List<Map<String, Object>> active(String account);

    /**
     * 取消任务；已结束的任务保持原状态。
     */
    Map<String, Object> cancel(String account, String jobId);

    /**
     * 客户端已把最终结果写入聊天记录，之后不再出现在 active 列表里。
     */
    void acknowledge(String account, String jobId);
}
