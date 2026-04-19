TOPIC_RULES = {
    "immigration": [
        "签证",
        "居留",
        "续居留",
        "aima",
        "移民",
        "家庭团聚",
        "家庭 reunification",
        "居留卡",
    ],
    "law": [
        "法律",
        "合同",
        "租房",
        "房东",
        "押金",
        "劳动法",
        "纠纷",
        "权益",
    ],
    "living": [
        "nif",
        "niss",
        "sns",
        "税",
        "报税",
        "医保",
        "医疗",
        "公共服务",
    ],
    "work": [
        "工作",
        "招聘",
        "求职",
        "工资",
        "简历",
        "面试",
        "工时",
    ],
}


def route_query(query: str) -> str:
    lowered = query.lower()
    for topic, keywords in TOPIC_RULES.items():
        for keyword in keywords:
            if keyword.lower() in lowered:
                return topic
    return "general"
