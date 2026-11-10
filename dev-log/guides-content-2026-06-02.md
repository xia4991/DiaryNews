# 实用指南内容规划 + 攻略全文（待去重落库）

来源：workflow `practical-guide-content-plan` + `practical-guide-research-remaining`。攻略正文由联网研究 + 自我核查生成，**移民/税务/法律信息易变，落库前与发布给用户时务必标注「以官方门户为准」**。

## 数据落库须知
- `src/data/practicalGuides.js` 当前被权限禁止读取——**写入前必须与现有条目去重**，并把下方 `category`/`type` 对齐真实的 `GUIDE_CATEGORIES` / `GUIDE_TYPE_META` 键。
- item 形状（从 `PracticalGuideTab.jsx` 推断）：`{ id, title, summary, category, type, importance('high'|'medium'|'low'), tags[], date, content[(段落)], links[{label,href}] }`，按 importance→date 排序，high 置顶。

## 优先级总表

| # | 选题 | 分类 | 类型 | 重要度 | 置信度 |
|---|---|---|---|---|---|
| 1 | AIMA | 居留身份 | guide | high | high |
| 2 | NIF | 税务财务 | checklist | high | high |
| 3 | NISS | 税务财务 | guide | high | high |
| 4 | SNS | 医疗健康 | guide | high | medium |
| 5 | 银行开户 | 银行金融 | guide | high | medium |
| 6 | 租房 | 住房租赁 | guide | high | medium |
| 7 | 驾照 | 交通出行 | checklist | high | high |
| 8 | 子女入学 | 教育 | guide | high | high |
| 9 | IRS | 税务财务 | guide | medium | high |
| 10 | 入籍 | 居留身份 | guide | medium | medium |
| 11 | 自雇 | 税务财务 | guide | medium | medium |
| 12 | 落地必办速查 | 生活实用 | resource | medium | medium |

---


## 1. AIMA　·　`居留身份` / `guide` / 重要度 high / 置信度 high

# AIMA 居留许可申请与续期全流程（含居留卡）

## 一句话摘要
葡萄牙移民局已由 **SEF（已于 2023 年 10 月 29 日撤销）** 转为 **AIMA（移民、融合与庇护署）**，居留卡（título de residência）的首次申请与续期（renovação）现通过 AIMA 线上门户办理；2025 起对过期居留卡有临时延期安排（多数延至 **2026 年 4 月 15 日**），但必须随身携带带 QR 码的续期申请凭证（comprovativo），切勿只拿过期卡。

---

## 办理步骤（具体可执行）

### A. 首次申请（针对持居留签证入境者 / 符合条件者）
1. **先备齐前置号码**：NIF（税号，向 Finanças/AT 申请）、NISS（社保号，向 Segurança Social 申请）。这两个号是后续所有材料的基础。
2. **办理住址证明**：自有房产用不动产登记证明（certidão de registo predial）；租房用房东出具的住房声明（declaração de alojamento）＋荣誉宣誓住址声明。
3. **预约 / 线上提交**：在 AIMA Loja（实体门店）预约，或通过正在推广的电子平台提交（持居留签证者）。约不到时通过 `contactenos.aima.gov.pt` 提交预约请求。
4. **生物信息采集（biometria）**：按预约到场采集指纹、签名、照片，并上传扫描件。
5. **缴费**：分两笔——受理分析费 ＋ 核发费（见下表）。
6. **领卡**：AIMA 决定后核发居留卡，邮寄到登记地址。**法定决定期限：首次 90 天内，续期 60 天内**。

### B. 续期（renovação）——按"卡过期日期"走两条不同路径
1. **过期日 ≤ 2025 年 6 月 30 日**：由 AIMA 特派任务组（Estrutura de Missão / EMAIMA）处理；面对面服务于 2025 年 12 月 30 日结束，已开始的流程后续转为线上由 AIMA 继续办理。专用网站只受理 2022/2/22–2025/6/30 间过期且已延至 2025/10/15 的卡（**不含 CPLP、黄金签证 ARI、欧盟家属类**）。
2. **过期日 ≥ 2025 年 7 月 1 日**：直接在 **续期门户（Portal das Renovações）** 提交，前提是税务与社保状况已规整（situação contributiva e fiscal regularizada）。
3. **续期申请窗口**：临时居留应在到期前 90 天内可申请、最迟到期前 30 天提交。卡仍有效或过期不足 6 个月者，可在 AIMA 门户"自动"续期；过期超过 6 个月须到 AIMA Loja 重新递交新申请。
4. **缴费 → 凭证**：系统出账后须在 24 小时内缴费；缴费后系统给出生物信息采集预约建议，缴费凭证 10 天内出现在个人账户。
5. **CPLP 类续期**：登录 `services.aima.gov.pt`，选 "Renovar AR CPLP" 重新验证账户 → 生成单一缴费凭证 DUC（10 个工作日内缴清）→ 收到预约邮件采集生物信息。

---

## 所需材料 / 费用 / 受理机构 / 处理时间

### 核心材料（首次申请，依 Art. 77.º 一般要件）
- 有效护照/旅行证件 ＋ 有效居留签证（免签情形除外）
- 住址/住房证明（自有：不动产登记证明；租住：房东住房声明＋荣誉宣誓）
- **NIF**（税号）＋ **NISS**（社保号）注册证明
- **医保**：私人健康保险 或 已纳入国家健保（SNS）的证明
- 生活来源证明（meios de subsistência）
- **无犯罪记录**：来源国/曾居住国的犯罪记录证明（需海牙认证 apostila ＋ 葡语公证翻译）；葡萄牙境内则签署"授权 AIMA 查询葡萄牙犯罪记录"声明（依 Art. 42.º-D，可替代纸质件）
- 续期通常无需重复提交原始件，但需税务/社保规整证明＋按类型缴费

### 费用（2026 年 3 月 1 日起新表，依 Portaria n.º 307/2023 合并版，部分涨幅达 33%）
| 项目 | 金额 |
|---|---|
| 临时居留 受理分析费（Art. 75.º） | **133 €** |
| 临时居留 核发/续期费（Art. 75.º n.º1） | **307.20 €** |
| 临时居留 数据变更（Art. 75.º n.º2） | 114.30 € |
| **临时居留续期常见总额** | **约 440.20 €**（133 ＋ 307.20） |
| 永久居留 核发（Art. 76.º n.º1） | 351.10 € |
| 永久居留 续期/数据变更（Art. 76.º n.º2） | 61.90 € |
| 免领事居留签证 | 99.80 € |
| 居留卡补办第二联 | 核发费的 50% |
| ARI 黄金签证 续期 | 4,210.30 €（核发 8,418.90 €） |

缴费方式：线上系统出账后 24 小时内缴清；CPLP 类用 DUC，10 个工作日内缴清。

### 受理机构
- **AIMA**：移民居留行政事务主体（继承 SEF 行政职能 ＋ 已撤销的 ACM 移民高专署）
- **IRN（登记与公证院）**：护照核发、部分居留续期的实体柜台接待（按约面办，由 IRN 主动联系排约）
- 边境/警务职能已分给 PSP、GNR、PJ（与居留申请无关）

### 处理时间
- 首次申请法定 **90 天**内决定；续期 **60 天**内决定
- 临时居留有效期一般 **2 年**，之后可续 **3 年**
- 居留卡决定后邮寄，到卡时间视积压而定（AIMA 称材料齐全清晰者审批较快）

---

## 常见坑 / 防骗提醒
1. **只带过期卡上街风险大**：临时延期"非自动"。被警察拦查时，必须同时出示过期居留卡 ＋ 带 QR 码的续期申请凭证（comprovativo，通过官方门户生成并打印）。
2. **延期文件不能出国用**：延长有效期的凭证仅在葡萄牙境内有效；出境/赴其他欧盟国必须持已换发的新卡。
3. **预约难抢 / 长期约不到**：约不到时走 `contactenos.aima.gov.pt` 提交预约请求；持续无法预约可向 **司法监察使（Provedor de Justiça）** 申诉，或申请法律援助（apoio judiciário），律师/移民法庭路径也可推动。
4. **通知进垃圾箱**：AIMA 用邮件要求确认申请并缴费，且缴费窗口仅 24 小时——务必把 AIMA 域名加白名单、勤查垃圾邮件，错过出账可能要重走流程。
5. **地址未更新致卡寄丢**：搬家务必更新登记地址，否则居留卡邮寄可能失败。
6. **翻译公证要求**：来源国无犯罪记录等外文件须海牙认证（apostila）＋ 葡语认证翻译，缺一会被退件。
7. **系统校验 bug**：实务中常见 NIF/NISS 校验失败卡住流程，需先确保税务、社保两边数据一致且已规整。
8. **防骗**：官方域名只有 `aima.gov.pt`、`services.aima.gov.pt`、`contactenos.aima.gov.pt`、`gov.pt`，警惕收费代办夸大"包过/加急"。

---

## 自我核查与置信度（核对最易变的 6 项）

1. **受理机构（SEF→AIMA）**：✅ 已核实。SEF 于 2023/10/29 00:00 正式撤销，AIMA 同日运作（依 Decreto-Lei n.º 41/2023）；护照与部分居留续期接待转入 IRN，警务转 PSP/GNR/PJ。来源：[Renascença](https://rr.pt/noticia/pais/2023/10/29/sef-oficialmente-extinto-aima-toma-o-seu-lugar-o-que-sabemos-sobre-a-nova-agencia/352901/)、[Observador 15问](https://observador.pt/2023/10/29/sef-extinto-agencia-para-migracoes-em-funcoes-o-que-muda-em-15-perguntas-e-respostas/)
2. **过期卡临时延期窗口**：✅ 已核实。2022/2/22–2025/6/30 间过期（曾延至 10/15）的卡延至 **2026/4/15**；2025/7/1 起过期的卡自其有效期日起再延 6 个月；非自动、须带 QR 凭证。来源：[idealista/news](https://www.idealista.pt/news/financas/economia/2025/10/23/72211-aima-cartoes-de-residencia-continuam-validos-seis-meses-apos-caducar)、[PÚBLICO](https://www.publico.pt/2025/10/18/publico-brasil/noticia/cartoes-residencia-validade-seis-meses-caducados-informa-aima-2151349)
3. **费用金额**：✅ 已核实（2026/3/1 起新表）。临时居留续期常见总额约 440.20 €（受理 133 € ＋ 核发/续期 307.20 €）；永久居留续期 61.90 €。来源：[SAPO](https://sapo.pt/artigo/aima-atualiza-taxas-para-regularizacao-de-imigrantes-com-aumentos-ate-33-69a6c9e5193466e805fce744)、[EntreRios](https://revistaentrerios.pt/postagens/aima-eleva-valores-de-autorizacoes-de-residencia-veja-quanto-custa/)。⚠️ 提醒：金额按类型/目的变动，最终以 AIMA 官方费表（Portaria n.º 307/2023 合并版）为准。
4. **续期资格/路径划分（6 个月、7/1 分界）**：✅ 已核实。卡有效或过期 <6 个月可线上续期；过期 >6 个月须到 Loja 重新申请；7/1 前后分两套系统。来源：[gov.pt 服务页](https://www.gov.pt/servicos/renovar-a-autorizacao-de-residencia)、[AIMA 续期门户公告](https://aima.gov.pt/pt/noticias/o-portal-das-renovacoes-ja-esta-disponivel)
5. **处理时限（90/60 天）与有效期（2 年 → 续 3 年）**：✅ 已核实。来源：[AIMA Art.77.º 页](https://aima.gov.pt/pt/viver/autorizacao-de-residencia-regime-e-requisitos-gerais-art-o-77-o-n-o-1)
6. **首次申请材料清单（NIF/NISS/医保/住址/无犯罪记录）**：✅ 已核实，与 AIMA Art.77.º 一致；无犯罪记录需 apostila＋葡语认证翻译。来源同上。⚠️ 不确定项：CPLP 专窗与 AIMA Plus 临时点的具体地址/开放时间变动频繁，未在本次核到逐点清单，需登录 `services.aima.gov.pt` 现查。

**总体置信度：高（核心事实有官方/权威媒体交叉佐证）。** 重要提醒给读者：**SEF 已撤销，现为 AIMA**；费用、预约渠道、延期日期常更新，**一切以 AIMA 官方门户（aima.gov.pt）实时信息为准**；本指引为通用流程，具体材料随居留类型（工作、学习、家庭团聚、CPLP、ARI）而异。

---

## 官方链接
AIMA 官网（居住与签证）: https://aima.gov.pt
续期门户公告（Portal das Renovações）: https://aima.gov.pt/pt/noticias/o-portal-das-renovacoes-ja-esta-disponivel
续期/CPLP 在线服务平台: https://services.aima.gov.pt/renovacao.php?la=pt
预约请求 / 联系: https://contactenos.aima.gov.pt
居留续期政府服务页（gov.pt）: https://www.gov.pt/servicos/renovar-a-autorizacao-de-residencia
首次居留一般要件（Art. 77.º）: https://aima.gov.pt/pt/viver/autorizacao-de-residencia-regime-e-requisitos-gerais-art-o-77-o-n-o-1
永久居留（Art. 80.º）: https://aima.gov.pt/pt/viver/autorizacao-de-residencia-permanente-art-80-o
财政/税号（Portal das Finanças / AT）: https://www.portaldasfinancas.gov.pt
社会保障（NISS / 社保）: https://www.seg-social.pt
国家健保 SNS 24: https://www.sns24.gov.pt
登记与公证院 IRN（护照/续期柜台）: https://justica.gov.pt/Servicos/Renovar-Autorizacao-de-Residencia
司法监察使（Provedor de Justiça，申诉）: https://www.provedor-jus.pt

---

## 2. NIF　·　`税务财务` / `checklist` / 重要度 high / 置信度 high

# 葡萄牙税号（NIF）申请完全指南：本人现场、税务代表与线上代办（2025–2026）

## 一句话摘要
税号（NIF, Número de Identificação Fiscal）是你在葡萄牙租房、开银行账户、签合同、入职、办居留的第一块基石；本人去税务局（Finanças）或公民商店（Loja do Cidadão）现场办理通常免费且当场出号，落地第一周务必拿到。

## 办理步骤（按三种路径）

### 路径一：本人现场办理（最推荐，免费、当场出号）
1. 建议先预约。拨打税务局客服中心电话 **(+351) 217 206 707**（工作日 9:00–19:00），或通过 AT 网站预约（"Atendimento por Marcação"）。直接到场排队也可以，但可能等很久。
2. 带齐材料前往任意一家 **Serviços de Finanças**（税务局）或 **Loja do Cidadão**（公民商店）。
3. 现场出示护照/身份证件 + 住址证明（详见下方材料清单）。非欧盟人士若仅出示护照，还需出示葡萄牙或申根的入境签证；若已有居留卡（título de residência）则一并出示。
4. 工作人员当场录入并**当场发给你 NIF 号码**（一张纸/凭条）。这一步是免费的。
5. 重要的"居民/非居民"区分：如果你已在葡萄牙有住址并打算居住，要明确告知按**居民（residente）**登记住址；只有在国外住址时才会登记为**非居民（não residente）**。这一选择直接影响后续税务身份（见"常见坑"）。

### 路径二：通过税务代表（representante fiscal）
1. 适用于你人还在国外、或暂时无法到场的情况。需委托一位在葡萄牙境内有住所的个人或公司（singular ou coletivo）作为代表/受托人。
2. 准备**经认证的授权委托书（procuração）**：一般需公证认证签名（reconhecimento de assinatura）；若受托人是律师（advogado）或事务律师（solicitador）并以该身份署名，则**免认证**。
3. 受托人代为向税务局提交：你的护照/身份证件复印件、国外住址证明（若证件上未显示住址）、受托人本人身份证件及委托书。
4. 注意：**申请 NIF 那一刻本身并不强制指定税务代表**。税务代表的强制性只在你后续与葡萄牙产生"税务法律关系"时才触发（详见材料/常见坑部分）。

### 路径三：线上代办 / 线上申请（2025 年 7 月起新增）
1. 自 **2025 年 7 月 1 日**起，无公民卡的外国人可通过 **Portal das Finanças 的 e-balcão** 在线申请 NIF。
2. 但外国人本人目前还无法在 Portal 上自我认证，因此**线上提交必须由持有委托书（procuração）的法定代表/受托人代为操作**（可以是律师或事务律师，此时委托书免认证）。
3. 需上传三份文件：本人身份证件（护照）复印件；国外住址证明（若证件上无住址）；代表本人身份证件及委托书。Portal 允许把多份文件压缩成一个文件上传。
4. 市面上的"付费线上代办服务"本质就是替你充当代表并跑这套流程——AT 不收费，但代办公司会收中介费。

### 拿到 NIF 后：在 Portal das Finanças 注册账号并设密码
1. 打开 Portal das Finanças，点击"Registar-se"（注册），填写 NIF、邮箱、电话、税务住址，并设置一个**安全问题及答案**（日后找回密码用），点击"Pedir Senha"。注册前确认税务住址（domicílio fiscal）是最新的。
2. 访问密码（senha de acesso）会以**纸质信件**寄到你登记的税务住址，约 **5 个工作日**。这是给非欧盟新移民的一大现实障碍——见"常见坑"。
3. 收到信后登录（NIF + 信中密码），系统会**强制要求你立即更换为新密码**（信中那串一次性密码不可再用）。密码须为 **8–16 位**，可含数字、字母或特殊字符。
4. 也可不用密码登录：注册后可通过 **Autenticação.Gov**（公民卡 Cartão de Cidadão）或**数字移动密钥 Chave Móvel Digital** 认证进入。

## 所需材料 / 费用 / 受理机构 / 处理时间

**所需材料**
- 身份证件：护照或同等法定身份证件（欧盟公民可用身份证）。
- 住址证明：显示住址的文件（本国或葡萄牙的均可）；若身份证件上已含住址则无需另附。
- 非欧盟（第三国）人士：附居留卡（título de residência），或仅凭护照时附葡萄牙/申根入境签证。
- 外文文件需经公证、律师或事务律师认证的翻译件。
- 走代表/线上路径时：另需代表的身份证件 + 授权委托书（procuração，按上文认证要求）。
- 提示：在葡萄牙有住址的外国人可一次性同时申请 **NIF + NISS（社保号）+ SNS 用户号（número de utente）**。

**费用**：向税务局申请 NIF **完全免费**（现场、线上、经代表均不收费）。若使用第三方代办/代表服务，可能产生中介费。

**受理机构**：税务及海关总署（Autoridade Tributária e Aduaneira, AT）——具体为 **Serviços de Finanças**（税务局）、**Loja do Cidadão**（公民商店），或线上的 **Portal das Finanças / e-balcão**。

**处理时间 / 是否当场出号**：
- 现场办理：**当场出号**，最快捷。
- 线上 / 经代表：由 AT 审核后发号，需通过指定联系方式接收，时间不固定。
- Portal 账号密码：约 5 个工作日纸质信件送达。

## 常见坑 / 防骗提醒
- **居民 vs 非居民登记会影响税务**：登记成"非居民"后，一旦你在葡萄牙产生税务法律关系（拥有车辆/房产、签劳动合同、个体经营），可能触发税务代表义务；真正成为葡萄牙税务居民后，必须主动到税务局**变更住址（alteração de morada）**为居民，否则税务身份与实际不符。
- **税务代表"何时强制"要分清**：申请 NIF 当下不强制。对住在第三国（非欧盟/欧洲经济区）的人，只有当出现下列"税务法律关系"才强制指定代表：在葡拥有登记车辆、拥有葡境内房产、签订在葡工作的劳动合同、或在葡个体经营。住在欧盟/挪威/冰岛/列支敦士登者为**自愿**。
- **2022 年放宽（重要）**：根据 **Decreto-Lei n.º 44/2022（2022 年 7 月 8 日，2023 年 1 月 1 日全面生效）**，住在第三国且有税务关系者，可不指定税务代表，改为**订阅电子通知渠道**（Portal das Finanças 电子通知/传唤、ViaCTT 电子邮箱、或数字唯一地址 Morada Única Digital）来替代。
- **例外**：若在葡从事须缴增值税（IVA）的个体经营活动，**仍必须指定 IVA 税务代表**，电子通知无法免除。
- **现实障碍——密码信寄不到国外**：Portal 访问密码默认走传统邮政寄到税务住址，AT 通常**不往欧盟以外地址寄信**，住在第三国的人可能收不到密码信，导致"订阅电子通知"这条替代路径在落地前难以走通。建议入境后用葡萄牙本地住址登记并取号、收信。
- **罚款风险**：应指定代表而未指定，罚款（coima）介于 **€75 到 €7 500**，且在未合规前无法向 AT 行使申诉、上诉等权利。
- **防骗**：AT 申请 NIF 本身免费。网上大量"快速 NIF 服务"按需收费可以用，但要分清你付的是中介费，不是政府规费；只通过 **gov.pt / portaldasfinancas.gov.pt** 官方渠道核对流程与电话。

## 自我核查与置信度

针对最易变/最关键的事实，逐条对照官方与权威来源核查：

1. **费用（本人现场免费）——已核实(verified)**：官方 gov.pt 迁移者页面明确"O pedido do NIF é gratuito"，多来源一致。来源：gov.pt 移民 NIF/NISS 页。**置信度高**。
2. **受理机构（AT：Finanças / Loja do Cidadão / 线上 e-balcão）——已核实(verified)**：gov.pt 与 AT 信息一致。**置信度高**。
3. **现场当场出号——已核实(verified，来自权威媒体/银行指南，非一手政府逐字)**：多来源指出现场即时发号，但官方服务页未逐字写明"当场"，故标注为基本确认但非政府逐字。**置信度中高**。
4. **所需材料（护照/身份证 + 住址证明；非欧盟附签证/居留卡）——已核实(verified)**：gov.pt 与 AT 折页内容一致。**置信度高**。
5. **税务代表强制门槛与 2022 年放宽（DL 44/2022，2023/1/1 生效）——已核实(verified)**：政府官网（portugal.gov.pt、gov.pt 新闻）及 AT FAQ 印证；触发条件（车/房/劳动合同/个体经营）一致。**置信度高**。
6. **2025 年 7 月 1 日线上 NIF（须经持委托书的代表提交）——已核实(verified)**：ECO（SAPO）2025-07-01 报道并引用 AT 说明；Observador 同日报道（付费墙未能逐字读取）。属较新政策。**置信度中高**（建议申请前再到 Portal das Finanças 确认 e-balcão 当前操作细节）。
7. **Portal 密码 5 个工作日纸质寄送、强制改密、8–16 位——已核实(verified)**：AT Portal FAQ（faqs-00244）等。**置信度高**；但"非欧盟地址收不到信"为实务观察（律师博客来源），标注为**实务提示/不确定程度中**。

**总体置信度：高**。

需向读者展示的免责声明：政策（尤其 2025 年线上申请的具体操作、电子通知渠道命名"Morada Única Digital"等）仍在演进；不同税务局窗口执行口径可能略有差异；本指南不构成法律/税务意见。办理前请以官方页面与 217 206 707 客服确认，涉及委托书认证、IVA 代表或复杂税务身份时建议咨询律师/事务律师。

## 官方链接
gov.pt 外国人如何申请 NIF 与 NISS（多语，含中文）: https://www2.gov.pt/migrantes-viver-e-trabalhar-em-portugal/migrantes-impostos-e-seguranca-social-em-portugal/como-pedir-o-nif-e-o-niss-para-cidadaos-estrangeiros-em-portugal
gov.pt 为自然人申请 NIF（服务页）: https://www.gov.pt/servicos/pedir-o-numero-de-identificacao-fiscal-para-pessoa-singular
Portal das Finanças 非居民外国人 NIF 归属（官方折页 PDF）: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/Atribuicao_de_NIF_a_cidadaos_estrangeiros_nao_residentes.pdf
Portal das Finanças NIF 单身自然人归属/变更 FAQ: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/Pages/faqs-00299.aspx
Portal das Finanças 税务代表（Representação Fiscal）FAQ: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/pages/faqs-00307.aspx
Portal das Finanças 注册与申请访问密码 FAQ: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/pages/faqs-00244.aspx
Portal das Finanças 找回密码: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Pages/Recuperar_senha.aspx
葡萄牙政府 非欧盟侨民可用电子通知替代税务代表（官方公告）: https://portugal.gov.pt/gc23/comunicacao/comunicados/emigrantes-fora-da-ue-poderao-trocar-representante-fiscal-por-notificacoes-eletronicas
gov.pt 非居民免指定税务代表新闻: https://www2.gov.pt/noticias/nao-residentes-dispensados-de-nomear-representante-fiscal-em-portugal
ECO 报道 2025/7/1 无公民卡移民可在 Portal das Finanças 申请 NIF: https://eco.sapo.pt/2025/07/01/imigrantes-sem-cartao-de-cidadao-ja-podem-pedir-nif-no-portal-das-financas/
Portal das Comunidades（外交部）领事窗口 NIF 归属: https://portaldascomunidades.mne.gov.pt/pt/atendimento/no-estrangeiro/servicos-consulares/atribuicao-de-numero-de-identificacao-fiscal-nif

---

## 3. NISS　·　`税务财务` / `guide` / 重要度 high / 置信度 high

# 在葡萄牙办理社保号（NISS / Número de Identificação da Segurança Social）完整指南——华人居民版

## 一句话摘要
NISS 是葡萄牙社保系统（Segurança Social）给每个人的唯一身份号，凡在葡工作、自雇或续居留/入籍累计年限的人都必须有它；目前外籍居民可在社保官网（seg-social.pt）"Sou Cidadão"栏目免费在线申请，备齐身份证件 + 居留/签证证明即可，办妥后再开通 Segurança Social Direta（SSD）在线账户查缴费、开"无欠款证明"（declaração de situação contributiva）。

## NISS 是什么、与 NIF 的区别、谁该在什么时候办
- **NISS vs NIF**：NIF（税号 / Número de Identificação Fiscal）由税务局（Finanças/AT）发放，用于报税、开银行户、签合同；**NISS** 由社保局发放，用于缴社保、领福利补贴、累计缴费年限。两者是**两个独立的号、两个不同机构**，不能互相替代。
- **持葡萄牙公民卡（Cartão de Cidadão）者和公司法人不需要单独申请**，NISS 是自动绑定/分配的。需要手动申请的是外籍人士和无义务持公民卡的本国人。
- **三类触发点**：
  1. **雇员（trabalhador por conta de outrem）**：签劳动合同前/时需要 NISS。雇主可代你向社保申请 NISS，但前提是已先签订劳动合同，并由雇主在 SSD 上申报雇佣关系（comunicação de vínculo）。
  2. **自雇 / 开活动（trabalhador independente / 绿色收据 recibos verdes）**：在 Finanças 开"活动"（abertura de atividade）后，税务局会自动把开业信息通报社保，社保**自动**把你归入自雇人员制度——但前提是你已有 NISS。缴费义务并非立刻产生：一般在**开业次月起算的第 12 个月的第 1 天**才开始（即头 12 个月通常免缴）。注意：自雇者的**配偶/事实婚伴侣**若一起从事该活动，须在**开业当月**强制申报。
  3. **家属 / 未成年子女**：父母或监护人可为尚无号码的子女/受抚养人申请 NISS。

## 办理步骤（在线申请，最常用）
1. 进入社保官网 www.seg-social.pt，主菜单选 **"Sou Cidadão"**（我是公民）。
2. 选 **"Atribuição de Número de Identificação de Segurança Social (NISS)"**。
3. 点 **"Pedido de NISS – Cidadão Estrangeiro ou Cidadão Nacional sem obrigatoriedade de ter Cartão de Cidadão"**（外籍/无义务持公民卡的本国人申请）。
4. 在线填写表单，**把所有材料合并成一个文件**上传（见下方材料清单）。
5. 提交。2025 年起新增**生物识别核验**（人脸/指纹），确保领号人与申请人一致。
6. 之后你会收到一封挂号信寄到你填写的地址，告知可去社保服务点（serviços de atendimento）领取 NISS；也可凭表单跟踪进度。本人领取须出示有效证件；亦可由律师（凭专业证 + 委托书）或他人（凭原件委托书或 PA-12 第三方授权声明）代领。

**一站式办理（强烈推荐新到者）**：有葡萄牙住址的外国人可在政府服务平台一次性同时申请 **NIF（税号）+ NISS（社保号）+ SNS 国民医疗用户号（número de utente）**。

**雇主代办路径**：雇主先签合同 → 在 SSD 申报雇佣关系 → 雇主代申请的仅限于"分配 NISS"这一项。
**代理人代办路径**：表单勾选"Existe uma relação de representação?"，并附代理人证件 + 委托书原件或 PA-12 授权声明（可在官网"Acessos Rápidos">"Formulários"下载）。

## 办妥后：开通 SSD 在线账户、查缴费、开证明
- **开通 SSD 账户**：进 Segurança Social Direta，点 **"Efetuar Registo"**。若你在社保系统里已登记手机号或邮箱，可用 **"Senha na Hora"** 即时拿到验证码（SMS/邮件）当场激活，无需等 PIN 信。也可改用**公民卡**或**数字移动密钥（Chave Móvel Digital）**登录。登录用 NISS + 密码（或邮箱/子账号）。
- **查缴费记录**：登录后可看"posição atual"（当前状况）、"registo de remunerações"（薪资/缴费记录）、提交各类申请。
- **开"缴费状况声明"（declaração de situação contributiva，即无欠款证明）**：在 SSD 内走 **Conta-corrente > Situação Contributiva > Obter declaração de situação contributiva > Obter nova declaração**。该证明带验证码（código de verificação），第三方可凭 NISS + 验证码在线核验真伪。
  - **重要限制**：**从未做过雇员或自雇的人，即使有 NISS，也无法在 SSD 在线开这份声明**，须到所在区社保服务点现场申请。

## 所需材料 / 费用 / 受理机构 / 处理时间
**所需材料（外籍人士，三类）**：
1. **身份证件**（申请时须在有效期内）：护照、工作签证、居留证或居留许可（临时/永久）之一。
2. **居留合规证明**之一：居留许可申请回执；CPLP（葡语国家共同体）公民的居留签证申请回执；CPLP 公民的居留许可授予证书申请回执等。
3. **工作情况证明**（如适用）：劳动合同等。
- EU/EEA/瑞士公民：附原籍国民事身份证件或居留卡。
- 第三国公民：附居留许可（临时/永久）或短期/季节性工作签证等。
- 国际保护对象（非乌克兰临时保护）：可用 ARP 临时居留授权申请/续期回执等。
- 代理人申请须另附代理人证件 + 委托书原件或 PA-12。

**费用**：官方在线申请 **免费**（gov.pt 明示）。缴费状况声明（无欠款证明）也 **免费**。
**受理机构**：葡萄牙社保局（Instituto da Segurança Social, I.P. / Segurança Social）；部分公民商店（Lojas de Cidadão）也可办。咨询热线：**210 545 400 / 300 502 502**（工作日 9:00–18:00）。
**处理时间**：官方未公布在线 NISS 的固定办结时限（提交后等挂号信通知领取）。缴费状况声明多为**即时出具**；若进入"Em análise"（审核中）状态，**最长可达 10 个工作日**；该声明**有效期 4 个月**。

## 常见坑 / 防骗提醒
- **号码下发延迟**：在线申请后需等挂号信通知领取，没有官方固定时限，建议提前规划，别等到签合同前一刻才办。
- **雇主未按时申报 → 缴费断档**：雇主须在 SSD 申报雇佣关系并按月申报薪资；他没做，你的缴费记录会出现缺口。**务必定期登录 SSD 自查"registo de remunerações"**，发现缺月及时催雇主补报，否则将影响居留续期与入籍年限累计。
- **自雇头 12 个月免缴≠不用管**：你已被自动纳入制度，第 12 个月第 1 天起开始有缴费义务，缴费须在所属月份**次月 10–20 日**之间完成；配偶/伴侣共同从事须开业当月强制申报。
- **"从未工作过"开不了在线证明**：有 NISS 但从无雇员/自雇记录者，须现场办理声明。
- **NISS 未同步到 AIMA**：续居留时若 AIMA 系统里没你的 NISS 或不一致，须先更新；AIMA 续期门户（2025-07-11 上线）要求**税务和缴费状况均已规整（situação fiscal e contributiva regularizada）**才能直接在线续。
- **防骗**：官方申请只在 **seg-social.pt** 或 **gov.pt**，全程免费。市面上 e-registo 等私营代办会收费且宣称"15–30 个工作日"等，那是其商业服务承诺，**不是官方时限**——你完全可以自己免费办。
- **续期材料衔接**：续居留通常需护照、维持原居留依据的证明（雇员附合同 + 近三个月工资单；自雇附 Finanças 开业证明 + 近三张绿色收据）、以及**缴费状况声明**。具体清单按居留类型不同而变，以 AIMA 官方清单为准。

## 自我核查与置信度
对最易变动的 6 个关键事实做了独立复核：
1. **在线申请免费** — 已核实（verified）：gov.pt 服务页与"如何为外国人申请 NIF 和 NISS"页均明示 NISS 与 NIF 申请 free / gratuito。来源：https://www.gov.pt/servicos/pedir-o-numero-de-identificacao-da-seguranca-social-niss- 、https://www2.gov.pt/migrantes-viver-e-trabalhar-em-portugal/migrantes-impostos-e-seguranca-social-em-portugal/como-pedir-o-nif-e-o-niss-para-cidadaos-estrangeiros-em-portugal
2. **受理机构 = 社保局 / 部分公民商店** — verified：seg-social.pt 与 AIMA/gov 文档一致。来源：https://www.seg-social.pt/atribuicao-de-numero-de-identificacao-da-seguranca-social-niss-
3. **所需材料（证件+居留证明+工作证明，CPLP/第三国细分）** — verified：来源 gov.pt 外籍 NIF/NISS 页与 seg-social.pt 实用指南（2025-09 更新）。
4. **2025 起生物识别核验** — verified（来源于 gov.pt 新闻），但其具体落地的服务点范围、是否所有申请都强制，官方页面未逐点列明，标 **uncertain**，建议办理前在服务点确认。
5. **缴费状况声明：免费、有效期 4 个月、最长 10 个工作日** — verified：seg-social.pt 声明页 + gov.pt 服务页。来源：https://www.seg-social.pt/declaracao-da-situacao-contributiva
6. **自雇头 12 个月免缴、第 12 月第 1 天起算** — verified：seg-social.pt 自雇缴费豁免页与新制度实用指南。来源：https://www.seg-social.pt/isencao-e-reducao-do-pagamento-de-contribuicoes1
- **标为 uncertain/无法确认**：在线 NISS 的**官方办结天数**——各官方页面均未给出固定时限（"15–30 个工作日"仅出自私营代办，不可当官方标准）。入籍年限对社保缴费的**具体计算口径**属国籍法/移民法范畴，本指南未逐条核证，应以 AIMA 及最新法律为准。
- **整体置信度：中高（medium-high）**。流程、渠道、材料、费用、声明有效期均有官方多源印证；不确定点集中在生物识别落地细节与办结时限。免责：社保与移民规则 2025–2026 仍在快速调整（AIMA 续期门户、生物识别等均为新政），具体到个人情形请以 seg-social.pt、gov.pt、aima.gov.pt 官方页面和现场服务点确认为准，并保留所有回执与凭证。

## 官方链接
- 申请 NISS（政府服务页 gov.pt）: https://www.gov.pt/servicos/pedir-o-numero-de-identificacao-da-seguranca-social-niss-
- 外国人如何申请 NIF 和 NISS（gov.pt，多语含中文）: https://www2.gov.pt/migrantes-viver-e-trabalhar-em-portugal/migrantes-impostos-e-seguranca-social-em-portugal/como-pedir-o-nif-e-o-niss-para-cidadaos-estrangeiros-em-portugal
- NISS 分配说明（社保局）: https://www.seg-social.pt/atribuicao-de-numero-de-identificacao-da-seguranca-social-niss-
- NISS 实用指南 PDF（外籍/无义务持公民卡者）: https://www.seg-social.pt/storage1/files/1010-PedidoNISSCidadaosEstrangeirosNacionais-ARQZ1OuYGZ9tAbnAHqFk3g.pdf
- 在线提交 NISS 申请入口（社保局）: https://www.seg-social.pt/pedido-de-formulario-niss-cidadao-estrangeiro
- Segurança Social Direta 注册（Senha na Hora 即时密码）: https://www.seg-social.pt/noticias/-/asset_publisher/kBZtOMZgstp3/content/faca-o-seu-registo-na-seguranca-social-direta
- SSD 登录/认证: https://app.seg-social.pt/sso/login
- 缴费状况声明（无欠款证明，社保局）: https://www.seg-social.pt/declaracao-da-situacao-contributiva
- 申请缴费状况声明（gov.pt 服务页）: https://www.gov.pt/servicos/situacao-contributiva-perante-a-seguranca-social-declaracao
- 自雇缴费豁免与减免（社保局）: https://www.seg-social.pt/isencao-e-reducao-do-pagamento-de-contribuicoes1
- AIMA 续居留门户（Portal das Renovações）公告: https://aima.gov.pt/pt/noticias/o-portal-das-renovacoes-ja-esta-disponivel
- 续居留服务页（gov.pt）: https://www2.gov.pt/servicos/renovar-a-autorizacao-de-residencia

---

## 4. SNS　·　`医疗健康` / `guide` / 重要度 high / 置信度 medium

# SNS 医疗实用指南：用户号、家庭医生与 SNS24 预约（写给在葡萄牙的华人居民）

## 一句话摘要
在葡萄牙看病、拿处方、给孩子打疫苗，第一步是去你住址所属的卫生中心（Centro de Saúde）登记拿到 SNS 用户号（Número de Utente），并申请家庭医生（médico de família）；日常预约和分诊可通过 SNS24 热线 808 24 24 24 或 App/网站完成；除了医院急诊（urgências），目前绝大多数基础医疗已不收挂号费（taxas moderadoras）。

## 办理步骤（具体可操作）

1. **确认你所属的卫生中心**：按住址所在区域就近办理。不确定是哪一家，可拨打 SNS24 热线 808 24 24 24 询问。

2. **去卫生中心登记拿 SNS 用户号（Número de Utente）**：本人到所属 Centro de Saúde 柜台，申请加入「全国用户登记」（Registo Nacional de Utentes，RNU）。**完全免费**，号码当场分配，可在 SNS 门户查询。外国人首次到任一公立卫生单位（卫生中心或医院）就医时也会自动获得此号。
   - 若你证件还不齐全（例如居留还在办理中），可先申请**临时用户号**（número de utente provisório），无需预约，日后证件齐全可直接转为正式号，无需重新登记。

3. **登记家庭医生 / 入册卫生中心**：在拿用户号的同时，向柜台申请「入册」（inscrição）并登记家庭医生。也可在 SNS24 门户在线办理（需数字移动密钥 Chave Móvel Digital 或带读卡器的公民卡 Cartão de Cidadão）。若暂时没有空缺，会被列入等候名单（lista de espera）。

4. **没有家庭医生时怎么看病**：即使未分配到家庭医生，你仍有权使用基础医疗。
   - **急性但非危急**：去卫生中心的「开放门诊 / 补充门诊」（consulta aberta / atendimento complementar），各中心开放时间不同，需先向本地中心问清楚。
   - **拿不准是否严重**：先拨 808 24 24 24 做分诊（triagem），由话务/护士判断是自我护理、基础医疗、急诊还是叫救护车（INEM）。
   - **非急症**：通过电话、SNS24 网站/App、或柜台预约 UCSP（个人化医疗单位）门诊。

5. **日常预约、续方、分诊（SNS24）**：
   - **电话**：拨 808 24 24 24（24 小时），按选项 5 预约门诊；手边备好用户号和个人信息。
   - **App / 网站**（App SNS 24 / Portal SNS 24，sns24.gov.pt）：可在线预约、护理预约（打疫苗、用药）、续方等；需先在个人区注册并用 Chave Móvel Digital 或公民卡认证。注意：**在线预约通常只能约到从当天起第 5 个工作日（含）之后的号**，急症请走电话分诊或开放门诊。

6. **孩子打疫苗**：在卫生中心的护理门诊（consultas de enfermagem）进行，免费；未成年人疫苗属免付费类别。

## 所需材料 / 费用 / 受理机构 / 处理时间

**受理机构**：住址所属 Centro de Saúde（卫生中心，含 UCSP/USF）；分诊与预约：SNS24（808 24 24 24 / sns24.gov.pt）。

**登记用户号 / 家庭医生所需材料**：
- 身份证件（公民卡、护照或居留许可 título de residência 之一）
- 税号（NIF）
- 住址证明（atestado de residência / 水电网账单 / 租约等，视情况）
- 欧盟公民可能被要求出示欧洲健康保险卡（CESD/EHIC）

**无居留人士的就医权利**（依《卫生基本法》Lei de Bases da Saúde，所有在葡居住者均为 SNS 受益人）：
- 持**所在堂区议会（Junta de Freguesia）开具的、证明在葡居住满 90 天的证明**，可办理 RNU「过渡性登记」，获得用户号。
- 即便处于「需付费」状态，以下护理**仍免付费**：紧急及危及生命的护理；危害公共卫生的传染病（如结核、艾滋）护理；母婴与生殖健康（产检、分娩、产后、新生儿护理、人工流产）；未成年人护理与疫苗接种。
- 经济困难、家庭团聚（家庭中有人缴纳社保）等情形也可免付费。

**费用（taxas moderadoras，2025–2026）**：
- **基础医疗（卫生中心）门诊、护理、家庭医生门诊，及由此开具并完成的检查/化验：自 2022 年 6 月起绝大多数已取消，免费。**
- 仍收费的**唯一**场景是**医院急诊（urgências hospitalares）**，且仅当你**未经 SNS24/卫生中心/INEM 转介**直接去急诊、且该次就诊未导致住院时才付费：
  - 综合急诊（Polivalente）18 €；医外科急诊（Médico-Cirúrgica）16 €；基础急诊（Básica）14 €
  - 加上就诊中所做检查（MCDT），每次急诊总额上限 **40 €**
  - **免付费的两种情况**：经 SNS 事先转介（通过 808 24 24 24 或卫生中心）去的急诊；就诊后被收治住院。

**处理时间**：用户号当场分配；家庭医生视空缺，可能需排队等候。

## 常见坑 / 防骗提醒

- **未登记导致挂号难**：没在卫生中心「入册」（inscrição）就无法预约常规门诊（急诊除外）。新人务必先拿用户号并入册，否则反复跑空。
- **有用户号 ≠ 自动报销**：拿到用户号本身不保证 SNS 承担费用，还需在登记时关联正确的居留/受益资格信息。
- **2025 新规——长期不就诊会失去家庭医生**：自 2025 年 1 月起，连续 5 年无就诊记录的外籍/移民居民可能被取消家庭医生资格；优先分配范围扩大到 12 岁以下儿童、孕妇、慢性病人。建议保持就诊记录、及时更新住址。
- **语言障碍**：就诊语言以葡语为主。可拨打 SNS24 寻求帮助，或请会葡语的亲友陪同；高难病情建议提前准备葡/英病史摘要。葡萄牙也有移民支持机构（如 ACM/AIMA 下属服务）可协助。
- **EHIC 与私人医保衔接**：欧盟旅居者用欧洲健康保险卡（EHIC/CESD）；长居者应走 SNS 登记。私立诊所（clínica privada）速度快但自费/走商业保险，与公立 SNS 是两套体系，账单和报销分开处理，别把私立账单当作可向 SNS 报销。
- **分工要分清**：危及生命/重伤→拨 112 或去医院急诊（Urgências）；急性小病→先打 808 24 24 24 分诊或去卫生中心开放门诊；常规问题→卫生中心门诊；买非处方药、咨询用药→药房（farmácia）。直接冲急诊看小病既排队久、又可能产生 14–18 € 费用。
- **防坑提示**：办用户号全程免费，任何收费「代办」都要警惕；以官方门户（gov.pt、sns24.gov.pt）信息为准。

## 自我核查与置信度

对 4–6 个最易变动的事实做了官方/权威源核对：

1. **用户号费用 = 免费、当场分配** — 已核实。来源：gov.pt 官方服务页（pedir-o-numero-de-utente-do-sns）。**置信度高。**
2. **受理机构 = 住址所属 Centro de Saúde（也可线上 SNS24 门户）** — 已核实。来源：gov.pt、ACSS「Registo Nacional de Utentes」。**置信度高。**
3. **急诊 taxa 数值 14/16/18 €、上限 40 €、转介或住院免付费** — 已核实，多源一致（医院 ULS 官方页 + SNS24 + 经济媒体）。法规：DL 113/2011、Portaria 480-A/2025/1。**置信度高。**注意各医院可能略有差异，且 2025/2026 IAS 调整可能影响经济困难免付费门槛（2025 约 783.75 €/月，2026 约 805.70 €/月）。
4. **基础医疗（卫生中心）自 2022 年 6 月起免 taxa** — 已核实。来源：SNS24、ERS。**置信度高。**
5. **无居留人士凭堂区 90 天证明可登记/免付费护理范围** — 已核实，但**存在不确定性**：2025 年 7 月监管机构 ERS 公开指出 RNU 规章与 2009 年 DGS 通函间存在法律冲突，并要求政府澄清；各地方卫生单位执行不一。**建议就医前向具体卫生中心确认。**来源：ERS FAQ、Público/Observador 2025 年 7 月报道。**置信度中。**
6. **2025 年家庭医生分配新规（5 年无记录失资格、12 岁以下优先）** — 来源为媒体（DECO PROTESTE、SAPO Executive Digest）转述政府措施，**未直接核到原始法令全文，标记为 uncertain，以官方为准。**

**总体置信度：中高。** 费用、受理机构、用户号免费、基础医疗免费等核心事实可靠；无居留人士付费/免费细则与家庭医生 2025 新规存在执行与法律层面的不确定性。

重要提醒：
- **SEF 已撤销，现由 AIMA（aima.gov.pt）负责移民/居留事务**；与居留、用户号关联的身份核验请以 AIMA 为准。
- 所有金额、门槛、资格规则**以官方门户为准**（gov.pt、sns24.gov.pt、ACSS、ERS）；地方卫生单位执行可能有差异，办理前最好拨 808 24 24 24 或向所属卫生中心当面确认所需材料。

## 官方链接
- SNS 用户号官方办事页（gov.pt）: https://www.gov.pt/servicos/pedir-o-numero-de-utente-do-sns
- 全国用户登记 RNU（ACSS）: https://www.acss.min-saude.pt/2025/07/16/registo-nacional-de-utentes/
- 卫生中心预约门诊（gov.pt）: https://www2.gov.pt/servicos/marcar-uma-consulta-no-centro-de-saude
- SNS24 预约门诊服务页: https://www.sns24.gov.pt/servico/marcacao-de-consultas/
- SNS24 门户登录: https://www.sns24.gov.pt/servico/iniciar-sessao-no-portal-sns-24/
- SNS24 挂号费 taxas moderadoras 说明: https://www.sns24.gov.pt/servico/taxas-moderadoras/
- ERS 挂号费 FAQ: https://www.ers.pt/pt/utentes/perguntas-frequentes/faq/taxas-moderadoras-do-sns/
- ERS 外国人就医权利 FAQ: https://www.ers.pt/pt/utentes/perguntas-frequentes/faq/acesso-de-cidadaos-estrangeiros-a-prestacao-de-cuidados-de-saude-no-servico-nacional-de-saude/
- 移民就医指南（ARSLVT/CNAIM FAQ，PDF）: https://www.arslvt.min-saude.pt/wp-content/uploads/sites/5/2020/08/FAQ_Gabinete_Saude_CNAIM.pdf
- AIMA（移民与居留，原 SEF）: https://www.aima.gov.pt

---

## 5. 银行开户　·　`银行金融` / `guide` / 重要度 high / 置信度 medium

# 葡萄牙银行开户 + MB WAY / Multibanco 日常支付实用指南（2025–2026）

## 一句话摘要
在葡萄牙领工资、付房租、收退税补贴都需要一个本地账户（带 PT50 开头的葡萄牙 IBAN）；先办好税号（NIF），备齐护照、住址证明和收入/在职证明，再到银行（线下大行或 ActivoBank 等线上银行）开户，激活 MB WAY 即可用手机日常收付款。新人被拒户最常见的原因是住址证明不被认可和合规材料不齐。

## 办理步骤

1. **先办 NIF（税号，Número de Identificação Fiscal）。** 这是开户的几乎必备前提。已持居留卡（título de residência）的在葡居民可直接本人到税务局（Finanças/AT）办理，免费，无需税务代表；拨打 217 206 707（工作日 9:00–19:00）预约。材料：护照（含申根签证）或本国身份证 + 居留卡。
2. **（如还没有居留、人在中国/非欧盟）通过税务代表线上办 NIF。** 非居民且居住在欧盟/挪威/冰岛/列支敦士登以外者，需委托一名在葡有住所的税务代表，由代表在税务局 e-balcão 提交申请。NIF 本身免费，费用来自代表服务费（律师、会计等）。
3. **顺便办 NISS（社保号，由 Segurança Social 发放）**，工作领工资和领补贴会用到。NIF 由 Finanças 发、NISS 由 Segurança Social 发，是两个不同机构、两个号码。
4. **选银行并备齐材料。** 居民优先选有葡萄牙 IBAN（PT50）的银行：线下大行（CGD、Millennium BCP、BPI、Santander、novobanco）或线上银行 ActivoBank（属 Millennium BCP 集团，有实体网点 Pontos Activo）。N26 是德国 IBAN，不接入 Multibanco/MB WAY，不建议作为葡萄牙主账户。
5. **开户：线下预约或线上申请。** 线下到分行需预约，当场核验原件；ActivoBank 等可线上 App 全程开户（视频/上传文件认证）。一到葡萄牙就尽早办，因合规审查流程现在变长。
6. **拿到 IBAN 后激活 MB WAY。** 两种方式：(a) 在任意 Multibanco 自动柜员机选 "MB WAY" → 输手机号 → 设 6 位 PIN → 收 SMS 激活码在 App 里验证；(b) 直接用 MB WAY App，前提是手机号已在银行登记，App 内输入后自动收验证码。最多可绑 8 张卡，但每个手机号/邮箱只能对应一个 MB WAY。
7. **把 IBAN 登记到 Portal das Finanças。** 登录葡萄牙税务门户 → Cidadãos > Serviços > Dados Cadastrais > IBAN → 输入并提交，约 2 个工作日变 "Confirmado"（已确认）状态。只有 "Confirmado" 的 IBAN 才有效，用于收 IRS 退税、Segurança Social 各类补贴（失业、疾病、育儿）、并可设置税款自动扣款（débito direto）。
8. **（可选）设置 débito direto 自动扣税。** 需在缴款截止日前 15 天以上加入，且 IBAN 须为 "Confirmado" 状态；扣款始终用税务登记里已确认的那个 IBAN。

## 所需材料 / 费用 / 受理机构 / 处理时间

**所需材料（开户，居民标准件）**
- 护照或本国身份证（护照需附申根签证）
- NIF（税号，几乎必备）
- 住址证明（comprovativo de morada）：水电/通信账单、IRS 退税单、税务住所证明，或教区议会（junta de freguesia）开具的居住证明
- 收入/在职证明：近期工资单（recibo de vencimento）、劳动合同或雇主声明；自雇者提供绿色收据（recibo verde）/开业证明；学生提供学生证、注册证明或学费缴费单
- 部分银行要求居留卡（título de residência）；2025–2026 合规收紧，可能还需填写税务居民自我声明、说明资金来源

**费用**
- NIF / NISS：免费（税务代表服务费另计）
- 账户：线下大行通常有月度账户维护费（comissão de manutenção）；ActivoBank 的 Conta Simples 主打无维护费、免费借记卡、SEPA 转账与 MB WAY 免手续费，但"Conta Digital Ordenado"（领薪账户）有约 750 欧元的开户最低额要求 —— 以银行官网当前条款为准
- MB WAY 转账：单笔 30 欧元以下免费，每月免费上限 150 欧元或 25 笔；超出部分借记卡最多收 0.2%、信用卡最多 0.3%

**受理机构**
- NIF：税务及海关总署 Finanças/AT
- NISS：社会保障局 Segurança Social
- 账户/MB WAY：各银行 + SIBS（Multibanco/MB WAY 网络运营方）
- IBAN 登记/退税/扣税：Portal das Finanças（葡萄牙税务门户）

**处理时间**
- NIF：本人现场当场可得
- 账户：线上数小时至数日；线下视预约与合规审查
- IBAN 在税务门户确认：约 2 个工作日
- IRS 退税：申报无误后通常约 12 天，法律上最迟 8 月 31 日

## 常见坑 / 防骗提醒

- **住址证明不被认可：** 邮件截图、未盖章信封、过期文件普遍被拒。请用近期正式账单/官方文件；尚无葡萄牙住址时部分银行接受原籍国住址证明，但政策因行而异。
- **合规审查冻结/拒户：** 2025–2026 反洗钱与合规收紧，可能要求说明资金来源并填税务居民声明。材料不全是新人最常见被拒原因——一次性备齐、带原件。
- **IBAN 状态不是 "Confirmado" 就收不到退税：** "In confirmation / Pending / Invalid / 所有权不符" 等状态都需你联系开户银行处理。无有效 IBAN 时退税改寄支票（记名、60 天有效期），过期可在 5 年内在门户重新激活。
- **N26 等外国 IBAN 的坑：** 德国 IBAN 可能导致某些葡萄牙服务的 débito direto 受限，且不接入 Multibanco/MB WAY。要领工资、设自动扣款，优先用 PT50 葡萄牙 IBAN。
- **MB WAY 诈骗：** 切勿把自己的账户绑到别人的手机号；二手交易中"买家"诱导你为"收款"去注册/操作 MB WAY 的，是典型骗局——收款不需要你输入 PIN 或扫对方给的码。
- **中国→葡萄牙跨境汇款：** 中国公民通常只能走银行 SWIFT 电汇（Wise 目前不支持中国公民主动从境内汇出）；受每人每年购汇 5 万美元限额约束，超额须凭用途证明在柜台办理。中行/工行等电汇费约汇款额 0.1%（有最低/封顶，如中行最低 50 元、最高 260 元/笔）+ 电讯费 + 约 0.3% 汇率差。反向从葡萄牙汇回中国用 Wise 更便宜，但收款人每年有约 5 万美元/30 万–60 万人民币上限。费率限额随时变动，操作前请向银行/平台核实。

## 自我核查与置信度

对 6 个最易变动的事实做了官方核对：

1. **NIF 发证机构 = Finanças（AT），NISS = Segurança Social，均免费** — 已核实（gov.pt 官方移民页面）。状态：verified。来源：https://www2.gov.pt/migrantes-viver-e-trabalhar-em-portugal/migrantes-impostos-e-seguranca-social-em-portugal/como-pedir-o-nif-e-o-niss-para-cidadaos-estrangeiros-em-portugal
2. **居民可不经税务代表本人直接办 NIF；非欧盟非居民需税务代表线上办** — 已核实（gov.pt 官方页面 + 税务门户资料）。状态：verified。
3. **IBAN 登记/débito direto：路径 Cidadãos > Serviços > Dados Cadastrais > IBAN；扣款用已登记确认的 IBAN；须在截止前 15 天以上加入** — 已核实（Portal das Finanças 官方 FAQ-00637）。状态：verified。来源：https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/pages/faqs-00637.aspx
4. **MB WAY 免费转账规则：≤30 欧免费，每月上限 150 欧或 25 笔，超出最多 0.2%/0.3%** — 来自 CGD/Santander/DECO 等行业来源，非单一官方法规文本。状态：mostly verified，具体阈值以各行当前条款为准。
5. **ActivoBank 无维护费、有实体网点；"领薪账户"约 750 欧元最低额** — 来自 ActivoBank 官网与比价站。状态：uncertain（最低额/条款常变），请以 activobank.pt 当前页面为准。来源：https://www.activobank.pt/simple-account
6. **中国每人每年购汇/汇款 5 万美元限额；银行电汇费约 0.1%** — 来自中国各行费率表/汇款指南，政策随时调整。状态：uncertain/可能过时，操作前请向汇款银行确认。

**整体置信度：中高。** 政府流程（NIF/NISS/IBAN/退税）置信度高；银行月费与最低存款、MB WAY 精确费率、中国端汇款限额随时间和机构变动，属于"以官方门户/银行官网当前条款为准"的部分。**重要提醒：SEF（外国人及边境事务局）已撤销，现由 AIMA（移民与庇护署，aima.gov.pt）负责居留与移民事务；本指南所有数字与流程请以官方门户最新信息为准。**

## 官方链接
- gov.pt 外国人办 NIF 与 NISS 指南（机构与材料）：https://www2.gov.pt/migrantes-viver-e-trabalhar-em-portugal/migrantes-impostos-e-seguranca-social-em-portugal/como-pedir-o-nif-e-o-niss-para-cidadaos-estrangeiros-em-portugal
- Portal das Finanças — Débito Direto / IBAN 登记官方 FAQ：https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/pages/faqs-00637.aspx
- Portal das Finanças 主门户（登记/查询/退税）：https://www.portaldasfinancas.gov.pt
- AIMA 移民与庇护署（居留事务，替代已撤销的 SEF）：https://aima.gov.pt
- Segurança Social（社保号 NISS、补贴）：https://www.seg-social.pt
- ePortugal 公共服务门户：https://eportugal.gov.pt
- CGD MB WAY 官方说明（如何加入与使用）：https://www.cgd.pt/Site/Saldo-Positivo/o-banco-e-eu/Pages/mb-way-como-aderir-como-funciona.aspx
- ActivoBank 免费账户官方页：https://www.activobank.pt/simple-account
- DECO PROteste 外国人开户/MB WAY 消费者指引：https://www.deco.proteste.pt/dinheiro/contas-ordem/dicas/abrir-conta-banco-portugal-como-tratar-for-estrangeiro

---

## 6. 租房　·　`住房租赁` / `guide` / 重要度 high / 置信度 medium

# 在葡萄牙租房与买房：合同要素、防骗清单与维权指南（华人新人版）

## 一句话摘要
租房务必签书面租约并核实房东产权、坚持押金（caução）不超过两个月房租、确认合同已在财政局（Finanças）登记并每月索取电子收据（recibo），警惕"先付定金/境外汇款才给看房"的假房东骗局；买房则走 IRN 的"Casa Pronta"一站式柜台办理过户与登记。

## 办理步骤（租房落地全流程）

1. **看房先核身份与产权**：要求房东出示身份证件与房产证明——可索取房产登记证明（certidão de registo predial / certidão permanente）和税务房产册（caderneta predial）。线上可在 IRN 的房产登记证明门户用房产标识核对真实业主。绝不接受"先转账才给看房/给钥匙"。
2. **谈定关键条款并要求书面合同**：超过 6 个月的租约必须书面订立。合同须写明：双方身份、房屋描述与税务地址、用途（habitação 居住）、**租期（duração）**、**月租（renda）及缴纳日**、**押金 caução**、续约（renovação）与提前解约条件、租金调涨规则。
3. **押金（caução）封顶两个月**：法律上押金不是强制的，但若约定，按《民法典》第 1076 条最高不得超过两个月房租（如月租 500€，押金最多 1000€）。务必在合同里写清押金金额、用途与返还条件。
4. **签约时做房屋状态存证**：入住前对房屋现状逐房拍照/录像并留存，退租时再拍一次，作为押金争议的证据。
5. **确认合同在财政局登记（contrato registado）**：登记是房东的法定义务——房东在合同生效次月底前，通过财政局门户提交印花税申报（Modelo 2 / Imposto do Selo，税额为一个月房租的 10%）。**2025 年 8 月 1 日起新规**：若房东不登记，租客可自行通过财政局门户的"承租人申报"（Comunicação do Locatário ou Sublocatário, CLS）申报，但只能在房东法定期限届满后才可操作（印花税仍由房东缴）。
6. **每月索取电子收据（recibo de renda eletrónico）**：房东有义务在收到房租后开具电子收据。这是你报税抵扣、申请住房补助和办居住证明的凭证。
7. **办地址相关证件**：拿着已登记的租约 + 房租收据，到所在堂区委员会（junta de freguesia）申请**居住证明（atestado de residência）**；同时建议在财政局更新税务地址（morada fiscal）。
8. **水电网煤气过户（mudança de titular）**：租客应成为水电气合同的持有人。备齐证件、税号（NIF）、租约、IBAN，以及旧账单上的电力点位码 CPE 和燃气码 CUI，向供应商（如 EDP，线上/电话 213 53 53 53/门店）办理过户；水务无自由市场，直接联系本市/本区供水实体。

## 所需材料 / 费用 / 受理机构 / 处理时间

**租约登记（印花税 Modelo 2）**
- 受理机构：财政局门户（Portal das Finanças / AT）
- 费用：一个月房租的 10%（印花税，房东缴纳）
- 期限：合同生效次月底前由房东申报；房东逾期后租客可走 CLS 自行申报
- 材料：合同信息、双方 NIF

**居住证明（atestado de residência）**
- 受理机构：堂区委员会（junta de freguesia），部分可线上或在公民商店（Loja de Cidadão）办理
- 材料：身份证件/护照/居留卡（título de residência）+ 地址凭证（已在财政局登记的租约、房租收据、水电账单之一）。若租约上没有你的名字，部分堂区要求房东出具声明或两名本区登记选民作证
- 费用/时间：因堂区而异，通常当场或短时办结（办前先查本堂区官网）

**水电网煤气过户（以 EDP 电/气为例）**
- 受理机构：能源供应商（电/气自由市场）；供水为本市供水实体
- 材料：身份证件、NIF、租约、IBAN（如选直接扣款）、旧账单上的 CPE（电）/ CUI（气）
- 费用：免费
- 时间：电力约 2–3 天；燃气需通过有效检验证或现场检验后才过户；总体常见 5–7 个工作日。注意：旧户主的欠费不会转到你名下

**买房一站式（Casa Pronta）**
- 受理机构：IRN（Instituto dos Registos e do Notariado）旗下 Casa Pronta 柜台（全国柜台均可办理，不限房屋所在地）
- 可办：买卖/赠与/交换合同、贷款与抵押登记、IMT 与印花税缴纳、IMI 减免申请、税务地址变更等
- 费用（截至 2026-05 官方）：单一登记行为约 375€（如仅买卖）；含多项登记（如买卖+贷款抵押）约 700€；优先权公告 15€
- 预约：官网 casapronta.pt 或现场
- 35 岁以下首套自住房可享 IMT 与印花税减免（截至约 324,058€ 房价区间）等优惠（以官方门户当年规则为准）

## 常见坑 / 防骗提醒

- **假房东 / 看不到房就要钱**：要求"先付定金（sinal）或押金才给看房/给钥匙"几乎必是骗局。务必先实地看房、核对业主身份与房产登记证明再付任何钱。
- **要求境外汇款或私人转账**：要求往海外账户、用加密货币或匿名转账的，立即停止。正规交易走葡萄牙本地银行账户并保留凭证。
- **无产权证明 / 名字对不上**：房产登记证明上的业主须与签约人一致，否则要求出示授权委托书。
- **押金被多收**：押金超过两个月房租即不合规；务必在合同写明金额与返还条件，并保留房屋状态照片作为退租依据。
- **房东不登记合同、不开收据**：这会让你无法报税抵扣、无法申请住房补助、也难以开居住证明。坚持索取电子收据；房东不登记时用财政局 CLS 自行申报。
- **口头协议**：超过 6 个月的租约必须书面，口头约定难以维权。
- **Casa Pronta 钓鱼网站**：IRN 已就假冒缴费链接发出警示，只用官方域名 casapronta.pt / justica.gov.pt / gov.pt。
- **退租押金不退 / 维修责任不清**：日常小维修通常归租客，结构性与正常损耗归房东；合同写清，照片存证。

## 自我核查与置信度

逐条核对了最易变动的事实：

1. **押金（caução）上限 = 2 个月房租**：已核实。《民法典》第 1076 条，押金非强制但约定时最高两个月房租。来源：[CGD Saldo Positivo](https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/caucao-no-arrendamento.aspx)、[Santander Salto](https://www.santander.pt/salto/caucao-arrendamento)。**已核实**。
2. **租客可自行登记合同（CLS）自 2025-08-01**：已核实，依 2025-03-13 第 106/2025/1 号部令（Portaria），印花税仍由房东缴，租客只能在房东法定期限届满后申报。来源：[DECO Proteste](https://www.deco.proteste.pt/dinheiro/arrendamento/noticias/inquilinos-ja-podem-declarar-contratos-arrendamento-financas)、[idealista/news](https://www.idealista.pt/news/imobiliario/habitacao/2025/03/13/68666-inquilinos-podem-registar-contratos-nas-financas-a-partir-de-agosto)。**已核实**（具体操作以财政局门户当时界面为准）。
3. **印花税 = 一个月房租的 10%、次月底前申报（Modelo 2）**：已核实。来源：[Doutor Finanças](https://www.doutorfinancas.pt/vida-e-familia/habitacao/como-fazer-um-contrato-de-arrendamento/)。**已核实**。
4. **维权渠道：BNA 已被取代**：**重要更正**——旧的"全国租赁柜台（Balcão Nacional do Arrendamento, BNA）"及租赁强制令系统（SIMA）已自 2024-02-16 起被**承租人与房东柜台（Balcão do Arrendatário e do Senhorio, BAS）**取代（第 49/2024、50/2024 号部令）。BAS 负责特别驱逐程序（PED）与租赁强制令程序（IMA），全国电子化受理。来源：[DGAJ/Justiça](https://dgaj.justica.gov.pt/Noticias-da-DGAJ/Balcao-do-Arrendatario-e-do-Senhorio-BAS-entra-em-funcionamento)、[Tribunais.org.pt](https://tribunais.org.pt/Arrendamento-e-despejo/Balcao-do-Arrendatario-e-do-Senhorio)。任务描述中的"BNA"为旧名，**以 BAS 为准**。
5. **Casa Pronta 费用与提供机构**：已对官方 gov.pt 核实——由 IRN 提供，单一登记约 375€、含多项登记约 700€、优先权公告 15€（截至 2026-05）。来源：[gov.pt 官方服务页](https://www.gov.pt/servicos/usar-o-servico-casa-pronta)、[casapronta.pt](https://www.casapronta.pt/)。**已核实**。
6. **水电气过户免费、电约 2–3 天、欠费不转移**：来源为 EDP 及能源比价站，**基本可信**（具体时长/检验要求随供应商而变，以供应商当时告知为准）。

**整体置信度：中高。** 法律框架（押金上限、印花税、CLS 新规、BAS 取代 BNA、Casa Pronta 费率）均有官方或权威来源支撑。需提醒读者的关键 caveat：
- **居住/移民事务方面：SEF 已撤销，现由 AIMA（aima.gov.pt）负责**；本指南聚焦租房买房，居留卡（título de residência）相关请以 AIMA 官方为准。
- 部分细节（堂区证明所需材料、押金返还实操、能源过户时长、买房青年税收减免门槛）因机构/地区/年度而异，**最终一律以官方门户当时公布为准**。

## 官方链接
Casa Pronta（官方服务说明，gov.pt）: https://www.gov.pt/servicos/usar-o-servico-casa-pronta
Casa Pronta（IRN 官网）: https://www.casapronta.pt/
承租人与房东柜台 BAS（司法部 DGAJ）: https://dgaj.justica.gov.pt/Noticias-da-DGAJ/Balcao-do-Arrendatario-e-do-Senhorio-BAS-entra-em-funcionamento
BAS / 驱逐与强制令程序（法院门户）: https://tribunais.org.pt/Arrendamento-e-despejo/Balcao-do-Arrendatario-e-do-Senhorio
财政局门户（Portal das Finanças / AT，合同登记与税务地址）: https://www.portaldasfinancas.gov.pt/
租约申报新规说明（DECO Proteste，2025）: https://www.deco.proteste.pt/dinheiro/arrendamento/noticias/inquilinos-ja-podem-declarar-contratos-arrendamento-financas
押金 caução 规则（CGD Saldo Positivo）: https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/caucao-no-arrendamento.aspx
居住证明 atestado de residência（DECO Proteste 指南）: https://www.deco.proteste.pt/familia-consumo/cidadania/dicas/atestado-residencia-serve-obter
水电气过户（EDP 搬家说明）: https://www.edp.pt/particulares/content-hub/mudar-de-casa/
移民/居留事务（AIMA，替代已撤销的 SEF）: https://aima.gov.pt/

---

## 7. 驾照　·　`交通出行` / `checklist` / 重要度 high / 置信度 high

# 中国驾照换领与认证（IMT / Carta de Condução）—— 在葡中国居民实用指南

## 一句话摘要
中国（大陆）既未加入《维也纳/日内瓦道路交通公约》，也与葡萄牙没有驾照互认双边协议，因此中国大陆驾照在葡**不能简单换证**——成为居民后必须在规定期限内向 IMT 申请，并且**通常要参加葡萄牙的驾驶考试（路考，必要时含笔试）**才能拿到葡萄牙驾照；窗口期短、超期等同无证驾驶，务必尽早办理。（注意：澳门 RAEM 驾照属另案，可直接认可；本指南针对中国大陆驾照。）

## 办理步骤（具体流程）

1. **落户后 60 天内：向 IMT 登记居住地址**。在葡定居者有义务在 60 天内将住址通报所在区的 IMT，否则属违规（这是法定义务，独立于换证）。

2. **盯紧两个时间节点（最关键）**：
   - 取得居留许可后的**前约 90 天**内，原则上你还可以用原驾照过渡，但应在此期间**启动换证/申请流程**；
   - 90 天后即不得再凭外国驾照在葡驾驶；
   - 但你仍有**最长 2 年**（自取得居留之日起）可以提交换证申请；
   - **超过 2 年就不能再走换证程序**，只能像新手一样报考驾照。
   - 另有一条硬性限制：原驾照**自签发或最近一次换证起不得超过 15 年**，且不得处于扣留、吊销、过期、注销状态。

3. **办理体检证明（atestado médico）**：找一名在 IMT 注册的医生做驾驶适性体检（不是普通体检）。医生会把体检结果上传到**电子体检证明平台**，自动传给 IMT，**你无需自己提交纸质件**。C/D 类等职业类别还需心理评估证明（certificado de avaliação psicológica）。

4. **准备并办理"真实性认证 + 翻译"**（中国驾照专属难点）：因为中国是非公约国/无双边协议国，必须额外提供：
   - **驾照真实性声明（declaração de autenticidade）**：由发证机关或外交/领事机构出具，证明驾照真伪、签发日期、有效期、准驾类别及考试合格情况；
   - **经认证的翻译件**：中文驾照需翻译，且翻译须经葡萄牙（或其他欧盟成员国）驻华领事机构认证。

5. **线上提交申请（2026 年 1 月 21 日起为唯一渠道）**：
   - 登录 IMT 服务门户 / "A Minha Carta de Condução"（aminhacartadeconducao.imt-ip.pt），用**数字移动密钥（Chave Móvel Digital）或公民卡（Cartão de Cidadão）**注册并认证；
   - 选择"Troca de Carta Estrangeira（外国驾照换证）"，填写表单、上传所需材料、在线缴费；
   - 提交后等待 IMT 审核，后续指示通过注册邮箱发送。**自 2026 年 1 月 21 日起，包括马德拉在内已取消该业务的现场窗口办理。**

6. **参加驾驶考试（中国大陆驾照的核心环节）**：由于属非公约国，IMT 会通知你到窗口登记考试申请、采集生物特征数据并现场缴考试费，随后通知考试日期。**每个准驾类别都要分别考试**；AM、A1、A2、A、B1、B 类笔试可提供翻译版本。

7. **领取葡萄牙驾照**：换证平均约 60 天发证；需路考的情况会更久。**等待期间会发放临时驾驶许可（guia provisória），凭此可继续在葡驾驶**直到拿到正式驾照。原中国驾照需交给 IMT，将由葡方退还给中国发证机关；日后回国可申请取回。

## 所需材料 / 费用 / 受理机构 / 处理时间

**所需材料：**
- 有效且为正式（非临时）的中国驾照原件（最终要交给 IMT）
- 葡萄牙身份/居留证件：居留许可（autorização de residência）/ 居留卡（título de residência）
- 税号 NIF（Número de Identificação Fiscal）
- 电子体检证明（atestado médico，由 IMT 注册医生上传）
- 证件照
- **驾照真实性声明（declaração de autenticidade，发证机关或领事/外交机构出具）**
- **经葡领事认证的驾照翻译件**
- 职业类别（C/D 等）另需心理评估证明

**费用：**
- 换证：**30 欧元**（线上办理享 10% 折扣）
- 驾驶考试：**每类约 30 欧元**（现场缴纳）

**受理机构：** IMT（Instituto da Mobilidade e dos Transportes）。2026 年 1 月 21 日起换证申请**仅限线上**通过 IMT 服务门户 / aminhacartadeconducao.imt-ip.pt 办理。

**处理时间：** 平均约 60 天发证；需路考者更长。等待期凭 guia provisória 可继续驾驶。

## 常见坑 / 防骗提醒

- **超期 = 无证驾驶**：90 天过渡期后用原驾照上路、或拖过 2 年窗口，都可能被认定为无证/无效驾照驾驶，面临罚款甚至更严重后果。务必尽早启动。
- **以为"中国驾照能直接换"是最大误区**：中国大陆未加入维也纳/日内瓦公约，也无对葡双边协议，**通常必须重考**（路考，每类分别考），而非简单换本。不要轻信中介"包直接换证、不用考试"的承诺。
- **翻译件不被认可**：普通翻译公司翻译往往不够，需经**葡萄牙（或欧盟成员国）驻华领事机构认证**；真实性声明也必须由发证机关或外交/领事机构出具，自制或非官方文件会被退回。
- **15 年限制**：原驾照签发/最近换证若超过 15 年，可能不被受理。
- **预约难 / 体检环节**：体检要找 IMT 注册医生；考试名额和窗口预约可能紧张，提前规划。
- **门户认证门槛**：线上申请需 Chave Móvel Digital 或公民卡认证，没有的话要先开通。
- **澳门 ≠ 中国大陆**：澳门 RAEM 驾照在葡可获认可，规则与大陆不同，别混为一谈。

## 自我核查与置信度

对 5 项最易变动事实做了官方核对：

1. **发证机构 = IMT，2026/01/21 起仅线上办理**：已核实（verified）。来源：IMT 马德拉公告 https://imt.madeira.gov.pt/index.php/pt/noticias/informacao-troca-de-carta-estrangeira-sera-efetuada-por-via-online ；IMT 门户 https://www.imt-ip.pt/condutores/reconhecimento/troca-de-titulo-de-conducao-estrangeiro/

2. **费用：换证 30 欧（线上 -10%），考试约 30 欧/类**：已核实（verified）。来源：gov.pt 服务页 https://www.gov.pt/servicos/trocar-carta-de-conducao-estrangeira-por-portuguesa

3. **中国大陆需考试（资格判定）**：已核实（verified）。中国大陆非维也纳1968/日内瓦1949公约缔约方、且不在葡双边协议国名单（巴西、瑞士、摩洛哥、安道尔、莫桑比克、圣多美、阿联酋、安哥拉等）内 → 属"非公约缔约国"，须重考。来源：UNECE 缔约方名单 https://unece.org/fileadmin/DAM/trans/conventn/CP_Vienna_convention.pdf ；葡领事说明 https://singapura.embaixadaportugal.mne.gov.pt/pt/seccao-consular/servicos-consulares/cartas-de-conducao ；gov.pt 服务页（"非公约国驾照在葡无效、须立即换证并每类考试"）。

4. **居民换证期限：90 天后不得再用原照、2 年内须申请、超期重考；另落户 60 天内登记住址；原照≤15 年**：**部分核实**（verified for 2 年期限、60 天发证、guia provisória、15 年限制、住址登记义务；"90 天过渡"这一具体天数在不同官方/半官方表述中略有出入，标记为 uncertain，务必以 IMT 门户/客服为准）。来源：gov.pt 服务页；IMT 门户。

5. **必备材料：原照、真实性声明、领事认证翻译、居留、NIF、照片、电子 atestado médico**：已核实（verified）。来源：gov.pt 服务页 + IMT 门户（"非欧盟国需发证机关/外交领事真实性声明 + 认证翻译""体检经电子平台自动传 IMT"）。

**重要提醒（请务必转告读者）：**
- **SEF 已撤销，移民/居留事务现由 AIMA 负责**（但驾照换证仍归 IMT，与移民局无关）。
- 公约缔约方名单、双边协议国名单、具体办理流程会不定期更新，**一切以 IMT 官方门户（imt-ip.pt / aminhacartadeconducao.imt-ip.pt）及 IMT 客服为准**。
- **总体置信度：中-高。** 资格判定（中国大陆需重考）、费用、线上化、核心材料为高置信；"90 天"等个别天数细节存在不确定性，建议办理前再向 IMT 确认。

## 官方链接
gov.pt 外国驾照换葡照服务页: https://www.gov.pt/servicos/trocar-carta-de-conducao-estrangeira-por-portuguesa
IMT 外国驾照换证总入口: https://www.imt-ip.pt/condutores/reconhecimento/troca-de-titulo-de-conducao-estrangeiro/
IMT 公约缔约国与其他情形说明: https://www.imt-ip.pt/condutores/reconhecimento/troca-de-titulo-de-conducao-estrangeiro/paises-aderentes-as-convencoes-e-outras-situacoes/
IMT 在线门户 "A Minha Carta de Condução": https://aminhacartadeconducao.imt-ip.pt
IMT 换证改为线上办理公告（马德拉）: https://imt.madeira.gov.pt/index.php/pt/noticias/informacao-troca-de-carta-estrangeira-sera-efetuada-por-via-online
UNECE 维也纳公约缔约方名单（确认中国未加入）: https://unece.org/fileadmin/DAM/trans/conventn/CP_Vienna_convention.pdf
葡萄牙领事处驾照说明（双边协议国名单参考）: https://singapura.embaixadaportugal.mne.gov.pt/pt/seccao-consular/servicos-consulares/cartas-de-conducao

---

## 8. 子女入学　·　`教育` / `guide` / 重要度 high / 置信度 high

# 葡萄牙子女入学登记完全指南：网上报名系统（Portal das Matrículas）

## 一句话摘要
在葡萄牙，6 至 18 岁是义务教育年龄，公立学校全程免费；每年 4 月下旬到 6 月初是学前班和小学一年级的报名窗口，家长须通过官方网站「报名门户」（Portal das Matrículas, portaldasmatriculas.edu.gov.pt）用公民卡（Cartão de Cidadão）、数字移动密钥（Chave Móvel Digital）或财政部账号（Portal das Finanças 凭证）登录在线办理，错过窗口可能耽误整整一学年——务必把报名日期标进日历。

## 办理步骤（以公立学校小学一年级 / 学前班为例）

1. **确认孩子是否到入学年龄**：小学一年级要求孩子在当年 9 月 15 日前年满 6 岁；学前班（pré-escolar）从 3-4 岁起可报名（4 岁起国家保证有学位，但非强制）。9 月 16 日至 12 月 31 日间满 6 岁的孩子，家长可在一年级与学前班之间选择。

2. **提前办好三个关键身份号码**（带娃家庭最容易卡在这一步，见下文「常见坑」）：孩子的税号（NIF）、健康号（Número de Utente / Número Nacional de Utente, NNU），以及若要申请校园社会补助（Ação Social Escolar）还需孩子的社保号（NISS）。监护人本人的 NIF 也必须有。

3. **准备登录方式**：三选一——公民卡（需读卡器和监护人与孩子双方 PIN 码）、数字移动密钥（Chave Móvel Digital，推荐华人家庭事先在 Espaços Cidadão 或 eportugal.gov.pt 激活）、或财政门户（Portal das Finanças）账号密码。

4. **在报名窗口期内登录** portaldasmatriculas.edu.gov.pt，选择「Matrícula」（首次入学）。注意：**报名先后顺序不影响录取**，只要在截止日前提交即可，不必抢第一天。

5. **按偏好填报学校**：依据 Despacho Normativo 2-B/2025（2026-2027 学年已被新的 Despacho Normativo 7/2026 修订），须按优先顺序填报 **5 所** 学校（学校选择少的小城市可填全部）。

6. **上传 / 确认材料**：系统会自动从公民卡或数字密钥读取住址；若读不到，需另行上传财政住址证明。要享受「学区就近」「有兄姐在校」等优先权，必须上传正确证明文件，缺失或错误将无法享受该优先级。

7. **提交后等待录取名单**：学前班和小学一年级录取名单在 **7 月第一个工作日前** 公布；其他年级在 7 月最后一个工作日前公布。

8. **录取后到校补交材料并完成「matriculado」状态**：学校在孩子被录取后会再要求补交文件，**疫苗本（Boletim de Vacinas）通常在这一阶段由学校索取**，而非网上报名时。

9. **转学 / 插班**：从国外教育系统转来的孩子（任何年级）也走 Portal das Matrículas 的「matrícula」流程；学年中转学走单独的「转学申请」（pedir transferência de escola, gov.pt 服务页）。从国外学历需办学历等同认证（equivalência）。

10. **语言支持（PLNM）**：报名时学校会识别母语非葡语的孩子并启动「非母语葡语」（Português Língua Não Materna, PLNM）流程，开学后做语言测试，按结果分级（零级 / 入门 A1-A2 / 中级 B1 / 高级 B2-C1）。注意：**巴西籍孩子因母语为葡语，不进入 PLNM**。

## 所需材料 / 费用 / 受理机构 / 处理时间

**网上报名时所需（核心）：**
- 监护人身份证件（公民卡或有效证件）+ 孩子身份证件（公民卡、护照或等同证件）
- 孩子的数字照片一张
- 监护人 NIF + 孩子 NIF
- 孩子的健康号（Número de Utente）、所属健康系统信息
- 住址证明：**官方只认财政住址证明（certidão de domicílio fiscal，财政门户开具）**；水电费单、银行单、租约不算。无公民卡时可用堂区（junta de freguesia）开的居住证明
- 孩子 NISS（仅在申请校园社会补助 ASE 时需要）
- 视情况另需：家庭成员构成证明（监护人非父母、或声明有兄姐在校时，由税务局 AT 验证）、监护证明、特殊教育需求报告（RTP）等

**录取后到校阶段常被追加：**
- 疫苗本（Boletim de Vacinas）、其他个人资料

**费用：** 公立学校报名与就读 **免费**（义务教育阶段学费、注册费全免）。NIF、健康号、NISS 的办理 **均免费**。

**公私 / IPSS 区别：**
- **公立（rede pública）**：义务教育阶段免费，按学区 + 优先级录取
- **私立（privado）**：自行收费、自主招生
- **社会团体 / IPSS 协议园校（setor social e solidário）**：常见于学前班，按家庭收入分档收费，部分有国家补贴；学前班的 IPSS 经历在公立小学录取中算一项优先级

**录取优先排序（小学，按 Despacho Normativo 2-B/2025）：**
1) 有特殊健康需求者 → 2) 上学年在同一校群（agrupamento）就读 → 3) **有兄姐等同户家庭成员在目标校就读** → 4) ASE 受益且监护人住在学区内 → 5) ASE 受益且监护人在学区内工作 → 6) **监护人住在学区内（就近入学核心）** → 7) 上学年在学区内社会团体机构读学前班 → 8) 监护人在学区内工作 → 9) 年龄（首次报名取年长者）。

**受理机构：** 教育系统管理署 / 教育部（Portal das Matrículas 由 Agência para a Gestão do Sistema Educativo / 教育部运营）；具体学校事务由所在学区校群（agrupamento de escolas）的校务处办理；疑难可查 DGEstE 的常见问题页。

**处理时间：** 报名窗口约 4 月下旬至 6 月初（小学 / 学前班）；录取名单 7 月初公布。

## 常见坑 / 防骗提醒

- **错过报名期 = 可能耽误一学年**：小学 / 学前班窗口短（约 4 月底到 6 月初），且系统按法定优先级而非「先到先得」录取，但过期提交会被排在所有按期者之后甚至无法办理。务必提前把日期标进日历。
- **疫苗本不全被退**：疫苗本（Boletim de Vacinas）通常在「录取后到校」阶段才要，但若孩子疫苗与葡萄牙国家疫苗计划（PNV）不符，学校会要求补种 / 补登记，可能拖延正式注册。建议入境后尽早带孩子到健康中心（centro de saúde）登记疫苗。
- **住址证明只认财政证明**：很多家庭拿水电单、租约去交被退；学区优先权全靠这份 certidão de domicílio fiscal，务必先到财政门户更新地址再开具。地址若不在目标学区，会失去最关键的「就近」优先级。
- **学位紧张需候补**：热门学区学位有限，即使住在学区也可能被排到候补名单；多填满 5 所学校、并如实上传兄姐在校 / 工作地证明可提高命中率。
- **与居留材料衔接（华人家庭最关心）**：教育是所有在葡儿童的权利，**未成年人入学和办健康号不要求先有居留许可**。孩子的健康号（Número de Utente）即便没有 NIF、没有居留许可也能以「registo atualizado」类型办理（未满 18 岁，且满 18 后还有 90 天缓冲期）。但 Portal das Matrículas 报名时通常要孩子的 NIF——可先就近到健康中心或 Espaços Cidaddão 办好 NIF + 健康号 + NISS（2025 年起可一次性整合办理）。
- **PLNM 落实不到位**：法律规定母语非葡语的新移民子女有权上 PLNM，但 2025 年有工会反映部分学校未按规定开班。若学校未主动安排，家长应主动向校务处书面申请并要求做语言分级测试。
- **防骗**：所有报名、NIF、健康号、社保号办理都 **免费**，官方网站域名以 `.gov.pt`、`.edu.gov.pt`、`.min-saude.pt` 结尾。任何收费代办「保证名校学位」「加急录取」的中介都不可信——录取由法定优先级决定，无法花钱插队。

## 自我核查与置信度

对最易变动的 5 项事实独立核对官方 / 权威来源：

1. **义务教育年龄段（6-18 岁，12 年）** — 已核实（verified）。依据 Lei n.º 85/2009 与 Decreto-Lei n.º 176/2012；小学一年级须 9 月 15 日前满 6 岁。来源：diariodarepublica.pt、gov.pt 移民教育页。置信度高。

2. **报名时间窗口** — 已核实但需注意学年差异（verified, year-specific）。2025-2026 学年小学 / 学前班为 4 月 22 日至 5 月 31 日（Despacho 3640-A/2025）；**2026-2027 学年为 4 月 22 日至 6 月 1 日**（Despacho 4472-A/2026，2026 年 4 月 6 日发布），gov.pt 官方服务页也列出 2026-2027 各年级日期。其他年级日期每年略有调整，报名前务必上 Portal das Matrículas 或本校群确认当年具体日期。

3. **登录方式（公民卡 / Chave Móvel Digital / 财政门户凭证）** — 已核实（verified）。三种官方认证方式一致出现于多份资料及 gov.pt。置信度高。

4. **费用免费** — 已核实（verified）。公立义务教育免费；NIF / 健康号 / NISS 办理免费。来源：gov.pt、ACSS（min-saude.pt）。置信度高。

5. **录取优先排序（含学区与兄姐优先）** — 已核实但法规在更新（verified, but evolving）。完整顺序源自 Despacho Normativo 2-B/2025（diariodarepublica.pt 全文）。**重要警示：该法规已被 Despacho Normativo 7/2026 修订**，2026-2027 学年可能适用新文本，细节优先级条目或有微调，请以当年生效法规为准。

6. **外籍未成年子女无需居留 / NIF 即可办健康号** — 已核实（verified）。来源：ACSS 2025 年公告、gov.pt 外国人证件办理页。但 Portal das Matrículas 报名时仍常要求孩子 NIF，建议提前办齐。

**疫苗本是否网上报名时必交** — 不确定（uncertain）：官方报名材料清单未列疫苗本，多份资料指出它通常在「录取后到校」阶段由学校索取。具体以本校群要求为准。

**总体置信度：中高（medium-high）。** 核心流程、费用、年龄、登录方式来自官方且稳定；**两项需读者自行二次确认**——(a) 当年精确报名日期（逐年由新 Despacho 设定），(b) 录取优先级细节（2026-2027 受 Despacho 7/2026 影响）。负责任的提醒：各校群（agrupamento）可对材料和到校补件有附加要求，最终请以 Portal das Matrículas 当年公告及目标学校校务处为准；居留 / 身份材料情况特殊的家庭，建议同时咨询 AIMA 与学校。

## 官方链接
报名门户 Portal das Matrículas: https://www.portaldasmatriculas.edu.gov.pt/
政府服务页（报名与续报名）gov.pt: https://www.gov.pt/servicos/fazer-pedidos-de-matricula-e-renovacao-de-matricula-nos-ensinos-pre-escolar-basico-e-secundario
移民子女在葡受教育 gov.pt: https://www2.gov.pt/migrantes-viver-e-trabalhar-em-portugal/migrantes-ensino-em-portugal-para-criancas-jovens-e-adultos
DGEstE 报名常见问题: https://www.dgeste.mec.pt/sinf/faqsmatriculas/
录取优先级法规 Despacho Normativo 2-B/2025（Diário da República 全文）: https://diariodarepublica.pt/dr/detalhe/despacho-normativo/2-b-2025-912066255
非母语葡语 PLNM（教育总署 DGE）: https://www.dge.mec.pt/portugues-lingua-nao-materna
学习非母语葡语 PLNM 服务页 gov.pt: https://www2.gov.pt/servicos/aprender-portugues-lingua-nao-materna
外国人申请 NIF / NISS / 健康号 gov.pt: https://www.gov.pt/servicos/pedir-os-numeros-de-identificacao-fiscal-seguranca-social-e-nacional-de-utente-saude-para-estrangeiros
外国人办 NIF 与 NISS gov.pt: https://www2.gov.pt/migrantes-viver-e-trabalhar-em-portugal/migrantes-impostos-e-seguranca-social-em-portugal/como-pedir-o-nif-e-o-niss-para-cidadaos-estrangeiros-em-portugal
ACSS 外国公民健康号简化办理（2025）: https://www.acss.min-saude.pt/2025/03/17/acss-reforca-simplificacao-no-acesso-ao-numero-nacional-de-utente-para-cidadaos-estrangeiros/
义务教育法规 Decreto-Lei n.º 176/2012: https://diariodarepublica.pt/dr/detalhe/decreto-lei/176-2012-179057

---

## 9. IRS　·　`税务财务` / `guide` / 重要度 medium / 置信度 high

# 葡萄牙个人所得税（IRS）申报与退税完全指南——华人居民版（2026 申报季 / 2025 收入年度）

## 一句话摘要
IRS（Imposto sobre o Rendimento das Pessoas Singulares，个人所得税）是葡萄牙税务局（Autoridade Tributária e Aduaneira，简称 AT）对个人全球收入征收的年度所得税；只要你是葡萄牙税务居民，每年 4 月 1 日至 6 月 30 日必须通过 Portal das Finanças 在线申报上一年度收入——按时、如实申报既关系退税到账，也是居留续期与入籍审查的合规底线。

## 办理步骤（具体可操作）

1. **确认你是否需要申报。** 葡萄牙税务居民（一年内在葡居住超过 183 天，或在葡有常住居所者）须就**全球收入**申报 IRS（CIRS 第 15 条「全球征税原则」）。即使全年只有工资且雇主已代扣代缴、最终无需补税，也通常仍须提交申报；持居留卡的华人居民几乎都属于应申报人群。无收入或仅有特定免申报情形的人例外，但建议保守处理。

2. **年初先做好两件「前置动作」（这些窗口已在 2026 年初截止，明年照此节奏）。**
   - **更新家庭状况（agregado familiar）**：出生、结婚、离婚、死亡、迁居等变动，须在约 2 月底至 3 月初前在 Portal 上确认（2026 年截止日为 3 月 2 日）。
   - **核对 e-Fatura 发票**：登录 e-Fatura 平台，把全年发票归入正确类别（健康、教育、房租、一般家庭开支等），2026 年的截止日为 3 月 2 日；健康发票关联处方（receita médica）的截止日为次年 2 月 15 日。

3. **3 月查看抵扣额并提出异议。** 3 月 16 日至 31 日，AT 在 Portal 上公布它替你核算的「应税额抵扣」（deduções à coleta），含健康、教育、住房、养老院、一般家庭开支等。发现遗漏或金额错误，必须在此窗口内提出申诉（reclamação）——这是申报前修正抵扣的**最后机会**。同期（截至 3 月 31 日）还可选择把 1% 的 IRS 捐赠（consignação）给社会/文化/体育机构，对你不增加任何成本。

4. **4 月 1 日—6 月 30 日：正式提交申报。** 登录 [Portal das Finanças](https://www.portaldasfinancas.gov.pt) → 进入 IRS 个人专区，用 NIF + 密码（senha de acesso）认证。系统会判断你能否走「自动申报」（见步骤 5），否则需手动填写 Modelo 3 主表加相应附件（Anexo）。

5. **判断是否适用预填的自动申报（declaração automática / IRS automático）。** 须**同时**满足以下全部条件才会收到一份预填、可一键确认的申报表：
   - 全年为葡萄牙税务居民、收入**仅来源于葡萄牙**、**不享有 NHR/IFICI 税务优惠身份**；
   - 收入仅为受雇工资（A 类）和/或养老金（H 类，赡养费除外）；
   - 适用预提税率的收入且不选择并入综合计税；
   - e-Fatura 发票已在期限内完成归类。
   2026 年新增：符合「青年税收优惠」（IRS Jovem）者也首次纳入自动申报。**有自营/个体收入（B 类，除特定简化制度外）、资本利得、房产租金、海外收入者一律被排除**，必须手动填 Modelo 3。

6. **海外收入：填写 Anexo J（华人尤其注意）。** 作为税务居民，国内或第三国的工资、房租、利息、股息、卖房卖股等**所有海外收入都必须申报**，填在附件 J（Anexo J）。已在境外缴的税通过 CIRS 第 81 条的「国际双重征税抵免」抵扣（抵免额取「境外已缴税」与「该收入对应的葡萄牙税额」两者中的较小值）。此外，海外银行/证券账户须在 Anexo J 第 11 栏「申报存在」（仅报账户信息、不报余额，纯信息义务）。

7. **登记 IBAN，等待结算与退税。** 提交前确保 Portal 上登记了本人名下葡萄牙银行账户的 IBAN，否则退税无法打款。提交后 AT 在 7 月 31 日前出具结算单（nota de liquidação），显示退税、补税或两清。**退税与补税截止日均为 8 月 31 日**：早在 4 月初确认者通常 4 月底至 5 月初就能收到退税；拖到期限末才提交的可能要等到 8 月。

## 所需材料 / 费用 / 受理机构 / 处理时间

- **受理机构**：葡萄牙税务局 AT，统一通过 **Portal das Finanças** 在线办理；不便上网者可到税务局柜台（Serviço de Finanças）、市民商店（Loja de Cidadão）或教区委员会（Junta de Freguesia）寻求协助。
- **费用**：自行申报**免费**。委托会计师（contabilista certificado）代办则按市场价收费（自营/海外收入复杂情形常见）。
- **所需材料 / 信息**：NIF 与 Portal 访问密码；本人 IBAN；雇主已申报的工资与预提税数据（系统多已预填）；e-Fatura 已归类的发票；海外收入的境外完税证明原件（须由来源国税务机关出具或认证，留存备查）；家庭成员 NIF（合并申报或有受抚养人时，配偶与受抚养人各自的密码也要分别登录确认）。
- **处理时间**：申报窗口 4 月 1 日—6 月 30 日；结算单最迟 7 月 31 日；退税/补税最迟 8 月 31 日。早申报通常更早退税。

## 主要抵扣项与额度（2025 收入年度，2026 申报；以官方 AT 手册为准）

- **一般家庭开支（despesas gerais familiares）**：支出的 35%，每人上限 250 欧（合并申报合计上限 500 欧）；单亲家庭 45%、上限 335 欧。含水电气、通信、超市、燃油、服装等。
- **健康（saúde）**：支出的 15%，全家合计上限 1000 欧；23% 税率的健康支出须关联医生处方才被接受。
- **教育与培训（educação）**：支出的 30%，上限 800 欧；异地就学（离家 50 公里以上、有登记租约）可把上限提至 1100 欧。
- **住房（habitação）**：永久居所房租抵 15%、一般上限约 700 欧（低收入者更高）；房贷利息仅限 2011 年底前签订的合同。
- **要发票抵 IVA**：部分消费可抵 15% 增值税（上限 250 欧/户）；公共交通月票/票、报刊订阅可抵 100% 的 IVA；健身房/体育俱乐部抵 30%。
- **抵扣总上限**：应税所得 ≤ 8059 欧者无上限；8059–80000 欧之间按公式（1000 欧起、最高约 2500 欧）递减；> 80000 欧者上限 1000 欧。三名及以上受抚养人每名上调 5%。

## 常见坑 / 防骗提醒

- **不申报 / 漏报直接影响居留续期与入籍。** AIMA 与归化审查会看税务合规记录；逾期申报即便不补税也算「税务违规」（incumprimento fiscal），并可能影响快速退税和税收优惠资格。注意：**SEF 已撤销，移民居留事务现由 AIMA（aima.gov.pt）负责**——别再去找 SEF。
- **海外收入「不报税局也查不到」是错误认知。** 70 多国与葡萄牙有自动信息交换（CRS）；漏报会被 AT 发函要求补报。早自首可大幅减免甚至免罚款（依 RGIT 第 29 条），拖到补充结算阶段则被动得多。
- **夫妻合并 vs 分开申报别想当然。** 已婚/事实婚（união de facto）可选合并（conjunta）或分开（separada）；自动申报会给出三种模拟（一份合并、两份分开），**逐一比对、选退税最多/补税最少的那个**——合并并非总是最优。
- **不要盲目「一键确认」自动申报。** 提交前核对个人信息、收入、预提税、社保扣缴、各项支出是否符合你 2025 年 12 月 31 日的真实状况；预填数据出错你照样担责。
- **IBAN 没登记 = 退税打不进来。** 务必提前在 Portal 登记本人名下账户。
- **NHR 已停发新名额，别被中介忽悠「还能办 NHR」。** 旧 NHR 制度已废止，取而代之的是 **IFICI（科研与创新税收优惠，俗称 NHR 2.0）**，适用范围窄得多（须从事经认可的科研/创新活动、雇主或项目须在 AT 年度名单内），并非「普通高收入移民」都能享。是否适用务必咨询持证会计师或税务师，以官方门户与专业意见为准。
- **防骗**：自行申报全程免费，任何索要「加急退税手续费」的电话/短信/邮件均为诈骗；只认 portaldasfinancas.gov.pt 官方域名，警惕仿冒钓鱼网站。

## 自我核查与置信度（核对最易变的关键事实）

1. **年度申报窗口 4 月 1 日—6 月 30 日** — 已核实（verified）。官方 gov.pt 服务页明确：「Entre 1 de abril e 30 de junho, do ano seguinte ao da obtenção dos rendimentos」。来源：https://www.gov.pt/servicos/simular-e-entregar-a-declaracao-anual-do-irs
2. **结算单 7 月 31 日前、退税/补税 8 月 31 日前** — 已核实（verified），来自多家银行/媒体引用官方日历，与 Portal das Finanças「IRS 2026 主要期限」官方手册一致。来源：https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/IRS_2025_Principais_prazos_2026.pdf （注：该 PDF 为图片型扫描件，无法逐字提取，日期以官方日历页与多源交叉一致为准）。
3. **自动申报资格条件（仅葡国内收入、A/H 类、非 NHR/IFICI、e-Fatura 已归类）** — 已核实（verified）。来源：[Portal das Finanças — IRS automático](https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Rendimentos/Declaracao/IRS_automatico/Paginas/default.aspx)
4. **抵扣额度（健康 15%/1000 欧、教育 30%/800 欧、一般家庭 35%/250 欧等）** — 大体核实（verified，但属高变动项）。来源：AT 官方手册「IRS – Deduções, benefícios fiscais e taxas para 2025」https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/IRS_deducoes_2025.pdf 。房租上限在不同来源略有出入，请以该官方手册数字为准。
5. **海外收入须报 Anexo J、双重征税抵免（CIRS 第 81 条）、海外账户须申报** — 已核实（verified）。来源：[Portal das Finanças — Rendimentos obtidos no Estrangeiro](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/IRS/Pages/Rendimentos_estrangeiro.aspx)
6. **NHR 已废止、由 IFICI 取代、适用范围受限** — 已核实（verified）。IFICI 由 Portaria n.º 352/2024/1（经 Portaria 52-A/2025/1 修订）及 Ofício-Circulado n.º 20276/2025 规范，须从事经认可的科研/创新活动。具体个人是否适用须专业评估。来源（专业机构）：https://www.pwc.pt/pt/servicos/fiscalidade/individuals-taxation/incentivo-fiscal-investigacao-cientifica-inovacao-rnh.html

**整体置信度：高**（窗口期、流程、海外收入义务、自动申报资格均有官方来源支撑）。**主要保留**：(a) 各项抵扣的精确欧元上限属年度高变动项，请以 2025 年度 AT 官方手册定稿数字为准；(b) IFICI 适用性极依赖个人具体情形，务必咨询持证会计师/税务师；(c) **特别提醒：SEF 已撤销，居留与移民事务现由 AIMA 负责**；所有税务事项**以 Portal das Finanças 官方门户为准**，本指南为信息性参考，不构成正式税务/法律意见。

## 官方链接

- 提交年度 IRS 申报（gov.pt 官方服务页）: https://www.gov.pt/servicos/simular-e-entregar-a-declaracao-anual-do-irs
- Portal das Finanças 税务门户（在线申报入口）: https://www.portaldasfinancas.gov.pt
- IRS 自动申报说明（AT）: https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Rendimentos/Declaracao/IRS_automatico/Paginas/default.aspx
- IRS 2026 主要期限官方手册（AT）: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/IRS_2025_Principais_prazos_2026.pdf
- IRS 2025 抵扣、税收优惠与税率手册（AT）: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/IRS_deducoes_2025.pdf
- 海外所得申报说明（AT）: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/IRS/Pages/Rendimentos_estrangeiro.aspx
- 财政税务年度日历（AT）: https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/calendario_fiscal/Pages/obrigacoes.aspx
- IFICI 科研与创新税收优惠（IAPMEI 官方）: https://www.iapmei.pt/PRODUTOS-E-SERVICOS/Incentivos-Financiamento/Beneficios-fiscais-(1)/IFICI-Incentivo-Fiscal-a-Investigacao-Cientifica.aspx
- AIMA 移民与居留（SEF 已由其取代）: https://aima.gov.pt

---

## 10. 入籍　·　`居留身份` / `guide` / 重要度 medium / 置信度 medium

# 葡萄牙入籍申请（Nacionalidade Portuguesa por Naturalização）实务指南

## 一句话摘要
2026 年葡萄牙国籍法（Lei da Nacionalidade）已正式修订并生效：经合法居留入籍的年限由 5 年大幅提高到**葡语国家/欧盟公民 7 年、其他国籍（含中国）10 年**，且年限改为从拿到第一张居留卡（título de residência）之日起算；申请向中央登记局（Conservatória dos Registos Centrais / IRN）提交，成人官费 **250 欧元**，须备齐 A2 葡语证书、中葡两地无犯罪记录、海牙认证（Apostila）的出生证明等，审理普遍需 18–24 个月。中国不承认双重国籍，入籍葡萄牙在法律上意味着失去中国国籍，须慎重规划。

## 办理步骤

1. **确认你已满足新的居留年限**：作为中国籍（非葡语国家、非欧盟），现行要求为**合法居留满 10 年**。年限自**第一张居留卡签发之日**起算（新法删除了"等待审批期间也计入年限"的旧规则）。务必先核对自己的居留是否全程连续、无断档。

2. **准备 A2 葡语证明**：报考 CAPLE 主办的 **CIPLE（Certificado Inicial de Português Língua Estrangeira，A2 级）**考试。中国籍不属于葡语国家公民，**不能豁免**，必须提供语言证明。在官方 CAPLE 网站（caple.letras.ulisboa.pt）报名，付款后保存报名号，考试当天携带与报名时完全一致的身份证件。

3. **办理出生证明的海牙认证 + 公证翻译**：从中国户籍/公证处取得出生公证书，办理**海牙认证（Apostila，中国自 2023 年 11 月起已加入《海牙取消认证公约》）**，并做葡语公证翻译。注意：证明类文件通常**有效期仅 6 个月**，不要太早办。

4. **开具中葡两地无犯罪记录**：需提供**出生国、国籍国、以及 16 岁后居住过的所有国家**的无犯罪记录证明（外国文件须 Apostila + 葡语翻译）。葡萄牙本地的无犯罪记录可在申请表中勾选由 IRN 官方代为调取（oficiosamente），无需自行提交。

5. **备齐合法居留全程证明**：包括历年居留卡（título/cartão de residência）、居留授权（autorização de residência）等，证明 10 年合法居留链条**完整无断档**。

6. **填写 Modelo 6.1 申请表**（IRN 官方表格，用于按居留时间归化），签署**忠于共和国原则的庄严声明**（新法新增要求）。

7. **提交申请并缴费**：
   - 在线：须由在葡注册的律师（advogado）或事务官（solicitador）通过 nacionalidadeonline.justica.gov.pt 提交（自 2023 年 12 月起律师/事务官强制线上）。
   - 本人办理：可亲临柜台或邮寄至中央登记局（Conservatória dos Registos Centrais）及其延伸窗口，包括里斯本与波尔图的移民融入支持中心（CNAIM）国籍柜台（Balcão da Nacionalidade）。
   - 缴费 **250 欧元**（本人办理可刷 multibanco/支票/邮政汇票；邮寄须随附付款凭证，否则退回）。

8. **等待审理并跟踪进度**：通过线上预留区域查询状态。获批后申办公民卡（Cartão de Cidadão）。

## 所需材料 / 费用 / 受理机构 / 处理时间

**所需材料（成人按居留归化）**
- Modelo 6.1 申请表 + 忠于共和国原则庄严声明
- 出生证明完整副本（Apostila 认证 + 葡语公证翻译）
- 出生国、国籍国及 16 岁后居住过各国的无犯罪记录（外国文件须 Apostila + 翻译；葡萄牙本地可委托官方调取）
- **A2 葡语证书（CIPLE）**
- 合法居留全程证明（历年居留卡/居留授权）
- 身份证件认证副本（护照、居留卡）
- 缴费凭证
- 注：英、法、西文件一般免翻译；证明类文件有效期约 6 个月

**费用**
- 入籍申请官费：**250 欧元**（成人，naturalização/aquisição，IRN 官方收费表确认）；无行为能力人 200 欧元
- 出生登记/国籍归属（atribuição，成人）：175 欧元
- CIPLE 考试费：约 **70–90 欧元区间**（各考点与报名类型略有差异，以 CAPLE 官网为准）
- 出生公证、海牙认证、翻译等额外费用视个人情况而定
- 18 岁以下未成年人入籍通常免官费

**受理机构**
- 中央登记局（Conservatória dos Registos Centrais）及其延伸窗口
- 里斯本 CNAIM（Rua Álvaro Coutinho, 14, 1150-025 Lisboa）、波尔图 CNAIM（Edifício Capitólio, Av. da França 316, 4050-276 Porto）的国籍柜台
- 主管部门：司法部下属国家登记与公证局（IRN）

**处理时间**
- 因申请量大，目前普遍约 **18–24 个月**（非官方承诺时长，仅为坊间估计，实际可能更久）

## 常见坑 / 防骗提醒

- **身份断档不计入年限**：年限要求"合法"居留连续完整。任何居留过期、续签脱节、长期离境导致居留失效的"断档"，都可能不计入或重置年限。这是华人最常踩的坑——务必保留每一次续签记录，提前续签。
- **年限新规改变起算点**：新法明确从**拿到第一张居留卡之日**起算，删除了旧规中"提交临时居留申请之日即起算"的算法，等待审批的时间不再计入。规划入籍时间务必以此为准。
- **黄金签证/投资居留路径已收紧**：新法配套政策对投资移民申请人计算更严格，相关投资移民请单独咨询律师。
- **材料认证链复杂、易过期**：出生证明、无犯罪记录都要 Apostila + 翻译，且证明类文件约 6 个月有效。办早了过期、办晚了影响进度，要倒排时间表。
- **材料不全=即时驳回**：官方明文规定，缺少法定必填事项或任一证明文件将导致"简易驳回"（rejeição sumária）。一次性备齐至关重要。
- **防骗**：在线申请只能通过官方域名 nacionalidadeonline.justica.gov.pt；缴费走 IRN 官方渠道。警惕收取高额"加急"的中介，IRN 无官方加急通道。"包过""保证 X 个月下证"均为虚假宣传。
- **CIPLE 报名走官网**：ciple.org、cipleonline.pt 等是第三方备考网站，**非官方报名机构**，正式报名必须在 CAPLE 官网（caple.letras.ulisboa.pt）完成。
- **TNIC 新测试**：政府正在开发"国家融入与公民测试（TNIC）"，作为 CIPLE 之外**额外**的社会知识测试（不替代 CIPLE），上线时间与细则待官方公布，请持续关注。
- **国籍冲突（重要）**：见下方。

### 关于与中国国籍冲突的现实影响
- 中国《国籍法》不承认双重国籍。根据中国法律，定居外国的中国公民**自愿取得外国国籍即自动丧失中国国籍**。
- 实务后果：一旦入籍葡萄牙，在中国法律上将不再是中国公民，须办理注销中国户口、放弃中国护照等手续；此后回中国须持葡萄牙护照办理中国签证，可能影响在华购房、社保、子女户籍等连带权益。
- 葡萄牙方面**允许**双重国籍，不要求你向其证明已放弃中国籍；冲突来自**中国一侧**的法律规定。
- 这是不可逆的重大决定，入籍前请就国内财产、户籍、社保、养老、子女身份等通盘规划，必要时咨询熟悉中葡两地的律师。

## 自我核查与置信度

针对 6 项最易变动的事实，逐条对照官方来源核查：

1. **居留年限（7/10 年）— 已核实（verified）**：官方 gov.pt 国籍服务页（更新于 2026-05-21）明确列出"葡语国家/欧盟公民 7 年、其他国籍 10 年"。新法已由议会 2026-04-01 通过、总统 2026-05-03 签署颁布。来源：https://www.gov.pt/servicos/pedir-a-nacionalidade-portuguesa
2. **年限起算点改为"拿到居留卡之日"— 已核实（verified）**：政府公报与多家媒体一致报道新法删除"等待期计入"的旧规则。来源：https://portugal.gov.pt/gc25/comunicacao/noticias/governo-reforma-exigencia-nas-leis-de-nacionalidade-e-residencia
3. **成人官费 250 欧元 — 已核实（verified）**：IRN 官方收费表确认成人 naturalização/aquisição 为 250€（atribuição 成人 175€、无行为能力人 200€）。来源：https://irn.justica.gov.pt/Custos-dos-servicos
4. **受理机构（中央登记局 / IRN / CNAIM 柜台）— 已核实（verified）**：justiça.gov.pt 与 IRN 确认提交渠道及 CNAIM 里斯本/波尔图地址。来源：https://justica.gov.pt/servicos/submeter-pedido-de-nacionalidade
5. **A2 葡语 / CIPLE 要求与中国籍不豁免 — 已核实（verified）**：法定 A2 最低水平，CIPLE 为 CAPLE 主办；豁免仅限葡语国家公民，中国籍须提供证明。来源：https://caple.letras.ulisboa.pt/exame/2/ciple
6. **CIPLE 考试费具体金额 — 不确定（uncertain）**：各来源给出 €85 至 €125–150 不等，因考点与报名类型而异，请以 CAPLE 官网报名页实时金额为准。
7. **审理时长 18–24 个月 — 不确定（uncertain）**：为坊间估计，非官方承诺；实际因案件量波动较大。

**总体置信度：中高。** 核心政策（7/10 年新法、起算点、250 欧元官费、受理机构、A2 要求）均已对照葡萄牙政府官方门户与 IRN 官方页面核实。需提醒读者的关键提示：
- **SEF 已撤销，移民/居留事务现由 AIMA 负责**（aima.gov.pt）；但**国籍/入籍**始终由司法部下属 **IRN / 中央登记局**主管，与 AIMA 分工不同，勿混淆。
- **新法处于刚生效、配套细则仍在落地的窗口期**：相关《刑法》修订（涉及剥夺国籍）仍在合宪性审查中；过渡安排、已提交案件是否适用旧规则等细节存在不确定性。**一切以官方门户（gov.pt、IRN）和《共和国公报》（Diário da República）公布的最新法令为准**，重大决定前请咨询专业律师。

## 官方链接
申请葡萄牙国籍（葡萄牙政府门户）: https://www.gov.pt/servicos/pedir-a-nacionalidade-portuguesa
提交国籍申请说明（司法部）: https://justica.gov.pt/servicos/submeter-pedido-de-nacionalidade
IRN 服务费用表（官费查询）: https://irn.justica.gov.pt/Custos-dos-servicos
国籍在线申请系统（律师/事务官）: https://nacionalidadeonline.justica.gov.pt/
Modelo 6.1 归化申请表（IRN PDF）: https://irn.justica.gov.pt/Portals/33/Impressos/Nacionalidade/Modelo%20%206.1.pdf
CIPLE / CAPLE 官方考试与报名: https://caple.letras.ulisboa.pt/exame/2/ciple
政府新法说明（年限收紧）: https://portugal.gov.pt/gc25/comunicacao/noticias/governo-reforma-exigencia-nas-leis-de-nacionalidade-e-residencia
AIMA（居留/移民事务，已取代 SEF）: https://aima.gov.pt
ePortugal 政务门户: https://eportugal.gov.pt

---

## 11. 自雇　·　`税务财务` / `guide` / 重要度 medium / 置信度 medium

# 自雇与开业完全指南：绿色收据与开业登记（Recibos Verdes / Atividade Aberta）

## 一句话摘要

在葡萄牙做自由职业、接私活或开小生意，必须先去税务局（Finanças）"开业登记"（abrir atividade），之后用葡萄牙财政门户开具"绿色收据"（recibos verdes / fatura-recibo）合法收款纳税；开业完全免费且全程可线上办理，第一年免缴社保，年营业额 15,000 欧元以下还可享 IVA 免税——但若漏报、社保断档或误判 IVA 门槛，会面临罚款，并直接影响居留续期（AIMA 续期要求提供收入证明）。

## 办理步骤

1. **准备数字身份认证**：开业和开收据都需要登录财政门户（Portal das Finanças）。需有公民卡（Cartão de Cidadão）或数字移动密钥（Chave Móvel Digital），以及税号（NIF）。

2. **确定经营类别 CAE / CIRS 代码**：开业前先查清你要从事的活动代码。自由职业（如翻译、设计、咨询、医生、律师等专业服务）对应葡萄牙个税法 CIRS 第 151.º 条职业表中的代码；商业/生产经营对应 CAE（经济活动分类代码）。一个独立工作者可设 1 个主代码 + 最多 19 个副代码。

3. **线上提交开业申报（declaração de início de atividade）**：登录财政门户 → "Todos os Serviços"（所有服务）→ "Início de Atividade"（开业）→ "Entregar declaração"（提交申报）。最迟须在你填写的"活动开始日"当天或之前提交。

4. **在申报表中做三项关键选择**（直接决定你今后交多少税，务必慎重）：
   - **IVA 增值税制度**：选第 53.º 条免税（isento art. 53.º，年营业额 15,000 欧元以下适用）或一般制度（regime normal）。2025 年 7 月起新规：开业当年不再需要预估全年营业额，只需预估"开业当月到年底"的额度，低于 15,000 欧元即可享免税。
   - **IRS 个税记账方式**：简化制度（regime simplificado，多数小额自雇者适用，无需会计师）或有组织记账（contabilidade organizada）。
   - **预估年收入**。

5. **社保自动登记**：税务局会自动把开业信息通报社保局（Segurança Social），无需你单独申请。系统自动把你纳入"独立工作者制度"（Regime dos Trabalhadores Independentes），并自动适用第一年的免缴规则。

6. **收款时开具绿色收据**：每次收到服务报酬，登录财政门户 → Cidadãos（公民）→ Serviços → Recibos Verdes → "Faturas e Recibos Verdes" → "Emitir"（开具）。填写金额，并在不豁免预扣时填写预扣税额（valor retido）。开具完全免费，无任何手续费。

7. **履行季度与年度义务**：免缴期结束后按季提交季度收入申报（declaração trimestral）；每年 4 月 1 日至 6 月 30 日在财政门户报个税（IRS），简化制度填附表 B（anexo B），有组织记账填附表 C（anexo C），并附 H（扣除）与 SS（社保）附表。

### 偶尔接一两单怎么办——"单次行为"（ato isolado）

如果只是偶发地做一两次服务、并不打算持续经营，**无需开业**，可随时直接开"单次行为"收据，更简单。但若收入持续/经常发生，必须正式开业。

## 所需材料 / 费用 / 受理机构 / 处理时间

**开业（abrir atividade）**
- 受理机构：税务与海关总局（Autoridade Tributária e Aduaneira，AT / Finanças）
- 材料：线上仅需财政门户登录凭证 / 公民卡 / 数字移动密钥；线下到税局柜台需身份证件（公民卡、身份证或护照）+ 税号；建议准备退税用的 IBAN 银行账号
- 费用：**线上免费**；线下纸质申报约 0.35 欧元
- 时间：即时生效（须在活动开始日当天或之前提交）

**开绿色收据**：线上即时、免费。

**社保（Segurança Social）**
- 第一年（前 12 个月）首次开业者**自动免缴**社保，无需申请。
- 免缴期后费率：对服务报酬，缴费基数为收入的 70%，费率 21.4%（即实际约为收入的 ~15%）；对商品生产销售，基数为收入的 20%。
- 免缴期满或重启活动后的头几个月，先按每月 20 欧元起缴，待提交第一份季度申报后按实际收入调整。

**会计师（contabilista certificado）**
- 简化制度：**不强制**请会计师（可花约 200–500 欧元请人代办年度报税）。
- 有组织记账：**法律强制**聘用注册会计师，2026 年市场月费约 150–300 欧元。
- 触发强制有组织记账的门槛：年收入连续两年超过 200,000 欧元，或单一年度超过 250,000 欧元（200,000 的 125%）。绝大多数小额自雇华人都在简化制度内。

## 常见坑 / 防骗提醒

1. **忘报 / 漏开收据致罚款**：收了钱不开绿色收据、或漏交季度/年度申报，会被税局和社保罚款，且会破坏你的"税务/社保正常状况证明"（situação regularizada），直接危及居留续期。

2. **IVA 门槛误判（2025 年 7 月新规）**：年营业额超 15,000 欧元，原则上次年 1 月起转一般制度，须在超额年度结束后 15 个工作日内提交变更申报；但若当年营业额超过 **18,750 欧元（15,000 + 25%）**，则**当场立即**转一般制度，就在超额的那张发票上开始计征 IVA，并须在 15 个工作日内提交变更申报。很多人误以为永远到次年才变，结果漏征 IVA 被追缴。

3. **社保免缴期是"福利"也是"代价"**：第一年免缴期间不计入养老金年限、也不能领取相应社会福利。免缴可主动放弃（提前缴费），若你想累积退休年限或想要福利保障，可考虑提前缴。

4. **免缴期生效有"整月"规则**：免缴期满后的纳入日并非按日精确计算。官方示例：2024 年 3 月 1 日开业 → 2025 年 3 月 1 日起纳入缴费；2024 年 1 月 10 日开业 → 2025 年 1 月 1 日起纳入缴费。请据此规划现金流，别等收到账单才发现要交钱。

5. **IRS 预扣（retenção na fonte）判断错误**：列入 CIRS 职业表的专业活动，2025 年最高预扣率已从 25% 降至 23%（但可自愿继续按 25% 预扣以免年底补税过多）。简化制度下，若上一年收入未超 12,500 欧元，免预扣；年收入超过 15,000 欧元则须做预扣。

6. **居留续期靠开业"加分"**：AIMA 续期需提供"生计来源证明"，自雇者通常用 **个税申报单（Declaração de IRS）+ 近 12 个月开具的绿色收据**，加上税局与社保的"无欠款/正常状况"证明。独立工作者居留还需"税局与社保开业证明"。所以保持收据连续、社保不断档，对续期至关重要。

7. **防骗**：开业和开收据都是官方免费服务，任何收取"开业代办费/系统费"的说法都不是官方收费（线下纸质表仅 0.35 欧元）。请只在 portaldasfinancas.gov.pt、seg-social.pt、aima.gov.pt 等官方门户操作。

## 自我核查与置信度

对 6 项最易变动事实做了官方/权威源核对：

- **开业费用与受理机构（已核实 / verified）**：线上免费、线下 0.35 欧元，受理方为 Autoridade Tributária（税局）。来源：gov.pt 官方服务页 https://www.gov.pt/servicos/abrir-atividade-nas-financas
- **第一年社保免缴（已核实 / verified）**：首次开业自动免缴前 12 个月，纳入按"整月"生效（官方示例如上）。注：gov.pt 上"申请社保免缴"页面讲的是"兼职累积"情形的另一种免缴，与"首年自动免缴"是两回事，已据 Segurança Social/gov.pt 与 PwC 2025 税务指南区分确认。
- **社保费率 21.4% / 基数 70%（已核实 / verified，2025–2026 适用）**：免缴期后按收入 70% × 21.4%（服务类）。来源：PwC 2025 税务指南、Segurança Social 服务页。
- **IVA 免税门槛 15,000 欧元 + 18,750 即时转换（已核实 / verified）**：第 53.º 条 2025 年限额 15,000 欧元，2026 年维持 15,000 欧元；超 18,750 欧元当场转一般制度。依据 Decreto-Lei n.º 35/2025（2025 年 7 月 1 日生效）。
- **IRS 预扣率 23%（已核实 / verified，2025 起）**：列表职业最高预扣率由 25% 降至 23%，可自愿维持 25%。来源：2025 年国家预算 / DECO PROTESTE。
- **强制有组织记账 / 会计师门槛 200,000 欧元（已核实 / verified）**：依 CIRS 第 28.º 条，连续两年超 200,000 或单年超 250,000 强制转有组织记账并须聘注册会计师。

**居留续期渠道（部分不确定 / partly uncertain，2025 年仍在变动）**：2025 年居留续期流程经历重大调整——2025 年 8 月 1 日起 IRN 不再受理续期，改由 AIMA"续期门户"（Portal das Renovações）分批开放；自动延期制度在 2025 年 10 月 15 日左右终止（Decreto-Lei n.º 85-B/2025）。具体可办理时间窗与材料清单仍在更新，**务必以 AIMA 官网最新公告为准**。

**整体置信度：高（税务与社保规则）/ 中（居留续期流程，时效性强）。**

重要提醒：
- **SEF 已撤销，移民居留事务现由 AIMA 负责**（部分续期职能 2025 年 8 月才从 IRN 移交 AIMA）。
- 税率、限额、IAS 指数每年调整（2025 年 IAS 为 522.50 欧元，2026 年升至 537.13 欧元），**一切以官方门户为准**。
- CAE 代码、IVA 制度、记账方式的选择会直接影响纳税额，金额较大或情况复杂时建议咨询注册会计师（contabilista certificado）。

## 官方链接

- 开业登记（gov.pt 官方服务页）: https://www.gov.pt/servicos/abrir-ativid度-nas-financas — 实际为 https://www.gov.pt/servicos/abrir-atividade-nas-financas
- 葡萄牙财政门户（开收据、报税、IVA/IRS 申报）: https://www.portaldasfinancas.gov.pt
- 社保局 — 独立工作者: https://www.seg-social.pt
- 社保免缴申请（gov.pt 服务页）: https://www.gov.pt/servicos/requerer-a-isencao-do-pagamento-de-contribuicoes-para-a-seguranca-social
- AIMA — 居留与续期总页: https://aima.gov.pt
- AIMA — 续期门户（Portal das Renovações）: https://services.aima.gov.pt/renovacao.php?la=pt
- AIMA — 独立职业活动居留（第 89.º 条）: https://aima.gov.pt/pt/trabalhar/autorizacao-de-residencia-para-exercicio-de-atividade-profissional-independente-com-dispensa-de-visto-de-residencia-art-89-o-n-o
- 注册会计师协会（OCC，找正规会计师）: https://www.occ.pt
- 续期一般服务页（gov.pt）: https://www.gov.pt/servicos/renovar-a-autorizacao-de-residencia

---

## 12. 落地必办速查　·　`生活实用` / `resource` / 重要度 medium / 置信度 medium

# 落地必办速查：公用事业、交通与紧急求助（2025–2026 葡萄牙华人新人版）

## 一句话摘要
拿到居留卡（título de residência）和税号（NIF）后，新人最该一次办完三件事：开通水电网燃气合同、办张 Navegante 月票、把紧急电话和官方 App 装进手机——其中数字身份钥匙（Chave Móvel Digital，简称 CMD）是登录所有政府平台的统一入口，最值得优先开通。

---

## 办理步骤（按落地顺序）

### 1. 先备齐"通用三件套"
办几乎所有事都要：NIF（税号）、IBAN（葡萄牙银行账号，用于直接扣款 débito direto）、地址证明（comprovativo de morada）。地址证明最常用三种：教区委员会（junta de freguesia）开的居住证明（atestado de residência，需本人到场）、租赁合同（contrato de arrendamento）+最近一期房租收据、或购房合同/房产登记。

### 2. 开通 CMD 数字身份（最优先）
- CMD 免费，葡萄牙人和外国人均可办。外国人凭护照或居留卡（título/cartão de residência）即可。
- 渠道：① 持葡萄牙公民卡可在 autenticacao.gov.pt 在线办（需读卡器+PIN）；② 通过财政门户（Portal das Finanças）用账号密码申请；③ 视频通话办理（仅限持葡萄牙公民卡者，需在 ePortugal 预约）；④ 到登记局（IRN）、公民窗口（Espaços Cidadão）等柜台现场办。
- 多数情况下需等一封含临时 PIN 的信件寄到登记地址，首次登录时用它激活，再改成自设 4–8 位 PIN。
- 激活时建议把 NIF、社保号（NISS）、医疗号（SNS）一并关联，后续登录各平台更顺。

### 3. 开通/过户 水、电、燃气、网络
- 过户（mudança de titularidade）免费，且不会断供。需要：新户主姓名+NIF、供电点代码 CPE（电）/CUI（燃气）（在前户主账单上，或向配电商 E-Redes 索取）、地址证明/用房权利证明、IBAN（走直接扣款）。
- 比价：用监管机构 ERSE 官方比价器 simuladorprecos.erse.pt 比较电与天然气的市场报价。合同无绑定期，ERSE 建议每 6 个月比一次。
- 主流供应商：EDP Comercial、Endesa、Galp、Iberdrola、Goldenergy、Repsol、Plenitude。
- 网络：与电信运营商（MEO、NOS、Vodafone、Digi 等）单独签约，也常需 NIF + IBAN + 地址。

### 4. 办 Navegante 月票（里斯本/波尔图）
- 里斯本大区（AML）：先到地铁/火车站窗口办一张带姓名+照片的个人卡（cartão personalizado），再充值月票。
- 月票二选一：单一市镇（municipal）30 欧/月；全大区 18 市镇（metropolitano）40 欧/月，覆盖地铁、Carris、Carris Metropolitana、CP 市郊火车。65 岁以上 20 欧。
- 月票按自然月计（每月 1 日至最后一日）。波尔图有对应的 Andante/Navegante 体系，按区段（zonas）定价，逻辑类似。

### 5. 火车与长途客运购票
- 火车 CP：用免费 CP App 或官网 cp.pt。可买 Alfa Pendular、Intercidades、以及波尔图/科英布拉市郊车票。最早提前 60 天、最晚发车前 15 分钟。2025 年 9 月起支持免登录购票、线上购卡、电子 CP 卡。票种 Promo（提前 5–60 天，便宜不可退）/ Normal（可退，收手续费）。也可在 Multibanco（ATM）、旅行社、车站窗口购买。
- 长途大巴：Rede Expressos（rede-expressos.pt，300+ 目的地，可线上买、出示纸质或电子票上车，免费会员 rflex）；FlixBus（flixbus.pt，欧洲廉价网络，邮件 PDF 带二维码或 App 内电子票，发车前 15 分钟可改签）。

### 6. 记牢紧急与求助电话
- 112：全国紧急号（含 INEM 医疗急救），用于危及生命：车祸有伤者、疑似中风、胸痛、噎住、呼吸困难、意识改变、严重烧伤、大出血。也用于报警、火警。
- SNS 24（808 24 24 24）：非紧急健康问题分诊与指引（轻中度疼痛、发烧、咳嗽、腹泻、儿童持续哭闹等）。两线互通，分诊若判定为危急会转接 INEM。
- 中毒求助：抗毒中心 CIAV 800 250 250（误服药物/清洁剂/植物/工业品等）。

---

## 所需材料 / 费用 / 受理机构 / 处理时间

| 事项 | 主要材料 | 费用 | 受理机构/渠道 | 处理时间 |
|---|---|---|---|---|
| CMD 数字身份 | 护照或居留卡 + 本人手机号 | 免费 | autenticacao.gov.pt、Portal das Finanças、ePortugal、IRN/公民窗口 | 在线即时；柜台当场；信件 PIN 需邮寄等待 |
| 水电网燃气过户 | 姓名+NIF、CPE/CUI、地址/用房证明、IBAN | 免费（不断供） | 各供应商在线/电话/门店；比价用 ERSE | 电约 2–3 天；燃气可能更久（或需通气检验 certificado de inspeção） |
| Navegante 个人卡+月票 | 身份证件+照片 | 卡工本费另计；月票 30/40 欧（65+ 20 欧） | 地铁/火车站窗口、portalviva.pt、navegante.pt | 卡当场办，月票即时充值 |
| CP 火车票 | 账号（可免登录）+支付方式 | 按票价 | CP App、cp.pt、ATM、车站 | 即时 |
| 居留地址/资料变更（AIMA） | 新地址证明等 | 视情况 | AIMA 联系表单 contactenos.aima.gov.pt → "Portal das Renovações > Comunicar/retificar morada" | 资料齐全后最长 2 个工作日更新 |

---

## 常见坑 / 防骗提醒
1. 忘办地址证明：教区委员会的居住证明常需本人到场；AIMA 现在比旧机构 SEF 更严，租房者可能被要求房东亲笔签署的居住声明，最好提前准备。
2. 月票区段买错：里斯本只在一个市镇活动买 30 欧 municipal 即可；要跨市镇（如住 Sintra 上班去 Lisboa）必须买 40 欧 metropolitano，否则查票被罚。波尔图按 zonas 计费，务必按实际通勤区段买。
3. 紧急时语言不通：拨 112 可要求英语接线；记住"非危急打 808 24 24 24（SNS 24），危及生命打 112"。中毒另拨 800 250 250。
4. 官网钓鱼仿冒：政府服务一律走 .gov.pt 域名（如 eportugal.gov.pt、portaldasfinancas.gov.pt、aima.gov.pt、sns24.gov.pt）。CMD、财政、社保都不会用短信链接催你"立即缴费/验证"。收到要求点链接付款或交 PIN 的短信/邮件，先不点，手动进官网核对。
5. 燃气过户要查证：天然气过户可能触发安全检验（每 3 年一次），有费用；备好有效检验证书可免重检。
6. 电费别忘调功率：过户时可顺便调整合同功率（potência contratada），避免长期多付。

---

## 自我核查与置信度

逐条核对最易变动的关键事实：

- ✅ 已核实｜SEF 已撤销，现为 AIMA：SEF 与 ACM 于 2023 年 10 月 29 日正式撤销，文件与居留业务由 AIMA + 登记局（IRN）承接，边检移交 PSP/GNR/PJ。来源：https://aima.gov.pt/ 及 gov.pt 居留续期页。
- ✅ 已核实｜Navegante 月票价：municipal 30 欧、metropolitano 40 欧、65+ 20 欧，2025 维持、2026 仍不涨。来源：portalviva.pt（官方门户）及 2025-12 多家媒体报道 AML 确认。
- ✅ 已核实｜CMD 免费且外国人可凭护照/居留卡办：来源：autenticacao.gov.pt 与 eportugal.gov.pt 官方说明。
- ✅ 已核实｜SNS 24 = 808 24 24 24（非紧急分诊）、112 = 紧急/INEM、抗毒 800 250 250：来源：sns.gov.pt"Quando ligar SNS 24 ou INEM"官方页。
- ✅ 已核实｜水电气过户免费、不断供，比价用 ERSE simuladorprecos.erse.pt：来源：ERSE 官方比价器；过户细节来自多家行业说明（电约 2–3 天）。
- ⚠️ 不确定/以官方为准｜AIMA 改地址的具体操作路径与所需证明文件：AIMA 门户与要求 2025–2026 频繁调整（如续期窗口、是否需 NISS、地址证明严格程度），办理前务必在 aima.gov.pt 或联系表单确认当下要求。CP App 偶有技术故障，建议保留官网/车站窗口作为备用购票渠道。

总体置信度：中高。价格、电话号码、机构归属等核心事实均来自官方或官方确认的近期来源（截至 2025 年底/2026 年初）。提醒读者：SEF 已不存在、一切以各 .gov.pt 官方门户的实时信息为准；月票区段、续期文件、燃气检验等细节因人因区而异，办前再核对一次。

---

## 官方链接
- ePortugal 政务总门户：https://eportugal.gov.pt
- 数字身份 CMD（认证）：https://www.autenticacao.gov.pt/a-chave-movel-digital
- 激活 CMD（gov.pt）：https://www.gov.pt/servicos/ativar-a-chave-movel-digital
- 财政门户 Portal das Finanças / AT：https://www.portaldasfinancas.gov.pt
- AIMA（移民居留）：https://aima.gov.pt
- AIMA 联系/改地址表单：https://contactenos.aima.gov.pt/contact-form
- 社保 Segurança Social：https://www.seg-social.pt
- SNS 24 健康线（808 24 24 24）：https://www.sns24.gov.pt
- SNS 24 vs INEM 何时拨打：https://www.sns.gov.pt/quando-ligar-sns-24-ou-inem/
- ERSE 能源比价器：https://simuladorprecos.erse.pt
- Navegante（里斯本月票）：https://www.navegante.pt — 充值/办卡：https://www.portalviva.pt
- CP 火车购票：https://www.cp.pt/pt
- Rede Expressos 长途客运：https://rede-expressos.pt
- FlixBus：https://www.flixbus.pt

---