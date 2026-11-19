import { mailRepository } from '../cloud/mailRepository';
import { MAIL_ITEMS, MAIL_REPORT_REASONS, parseMailRequest, parseOfficialDraft,
  type MailPlayer, type MailReportReason, type MailRequest, type MailRow, type OfficialDraft } from '../cloud/mailProtocol';
import { MAIL_REWARD_LABELS } from './mailAssets';
import './mailDialogs.css';

function node<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string): HTMLElementTagNameMap[K] {
  const element=document.createElement(tag);
  if (text!==undefined) element.textContent=text;
  return element;
}
function button(text:string,fn:()=>void,type:'button'|'submit'='button') {
  const control=node('button',text); control.type=type;
  if (type==='button') control.addEventListener('click',fn);
  return control;
}
function field<T extends HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(label:string,element:T) {
  const wrapper=node('label'); wrapper.append(node('span',label),element); return wrapper;
}
function input(type='text',max=140) { const value=node('input'); value.type=type; value.maxLength=max; return value; }
function box(max:number) { const value=node('textarea'); value.maxLength=max; value.required=true; return value; }

function dialog(title:string,onClose:()=>void) {
  const shell=node('dialog'); shell.className='mail-dialog'; shell.setAttribute('aria-label',title);
  const header=node('header'); header.append(node('h2',title),button('Đóng',()=>shell.close()));
  const status=node('p'); status.className='mail-dialog-status'; status.setAttribute('role','status');
  const content=node('div'); content.className='mail-dialog-content';
  shell.append(header,content,status);
  shell.addEventListener('close',()=>{shell.remove();onClose();},{once:true});
  document.body.append(shell); shell.showModal();
  const run=async(action:()=>Promise<void>)=>{
    if(shell.dataset.busy||!shell.open)return;
    shell.dataset.busy='1'; status.textContent='Đang xác nhận…';
    try { await action(); }
    catch(error){ if(shell.open) status.textContent=error instanceof Error?error.message:'Thao tác chưa hoàn tất.'; }
    finally { delete shell.dataset.busy; }
  };
  return {shell,content,status,run};
}

export function composeMail(owner:string,row:MailRow|undefined,completed:()=>void,closed:()=>void) {
  const {shell,content,status,run}=dialog(row?'Trả Lời':'Soạn Thư',closed);
  shell.classList.add('mail-compose');
  const form=node('form'), find=input('text',36), subject=input(), body=box(500), matches=node('div');
  subject.required=true; matches.className='mail-dialog-results';
  const selection=node('p','Chưa chọn người nhận.');
  let recipient: MailPlayer|undefined;
  const select=(player:MailPlayer)=>{
    recipient=player; selection.textContent=`Đến: ${player.name} · ${player.uid}`;
    matches.replaceChildren(); status.textContent='';
  };
  if (row?.peer_uid) {
    select({uid:row.peer_uid,name:row.sender});
    subject.value=(row.subject.startsWith('Trả lời: ')?row.subject:`Trả lời: ${row.subject}`).slice(0,140);
  } else {
    const search=async()=>{
      const query=find.value.trim();
      if(query.length<2)throw Error('Nhập UID hoặc tên nhân vật chính xác.');
      const result=await mailRepository.send(owner,{action:'search',query});
      if(!shell.open)return;
      recipient=undefined; selection.textContent='Chưa chọn người nhận.';
      matches.replaceChildren(...(result.players??[]).map(player=>button(`${player.name} · ${player.uid}`,()=>select(player))));
      status.textContent=result.players?.length?'Chọn người nhận trong danh sách.':'Không tìm thấy nhân vật.';
    };
    const lookup=node('div'); lookup.className='mail-dialog-inline';
    lookup.append(field('UID hoặc tên nhân vật',find),button('Tìm',()=>void run(search)));
    find.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void run(search);}});
    form.append(lookup,matches);
  }
  const count=node('small','0 / 500'); body.addEventListener('input',()=>{count.textContent=`${Array.from(body.value).length} / 500`;});
  form.append(selection,field('Tiêu đề',subject),field('Nội dung',body),count,button('Gửi Thư',()=>{},'submit'));
  let pending:{signature:string;requestId:string}|undefined;
  form.addEventListener('submit',event=>{event.preventDefault();void run(async()=>{
    if(!recipient)throw Error('Hãy chọn người nhận.');
    const args={action:'send',recipient:recipient.uid,subject:subject.value,body:body.value,replyTo:row?.id} as const;
    const signature=JSON.stringify(args);
    if(pending?.signature!==signature)pending={signature,requestId:crypto.randomUUID()};
    const request=parseMailRequest({...args,requestId:pending.requestId});
    if(!request)throw Error('Hãy kiểm tra độ dài và bỏ liên kết hoặc mã HTML.');
    await mailRepository.send(owner,request);
    if(shell.open){shell.close();completed();}
  });});
  content.append(form);
  return shell;
}

const reasons:Record<MailReportReason,string>={harassment:'Quấy rối',spam:'Spam',impersonation:'Mạo danh',other:'Khác'};
export function moderateMail(owner:string,row:MailRow,kind:'block'|'report'|'delete',completed:()=>void,closed:()=>void) {
  const prompt=kind==='block'?'Chặn người gửi':kind==='report'?'Báo cáo thư':'Xóa thư';
  const {shell,content,run}=dialog(prompt,closed);
  const reason=node('select');
  for(const id of MAIL_REPORT_REASONS){const option=node('option',reasons[id]);option.value=id;reason.append(option);}
  content.append(node('p',row.subject));
  if(kind==='report')content.append(field('Lý do',reason));
  if(kind==='block')content.append(node('p','Bạn sẽ không nhận thư mới từ người gửi này.'));
  if(kind==='delete')content.append(node('p',row.outgoing?'Ẩn thư khỏi danh sách Đã Gửi của bạn.':'Xóa thư khỏi hộp thư của bạn.'));
  content.append(button('Xác nhận',()=>void run(async()=>{
    const data:MailRequest=kind==='report'?{action:'report',mailId:row.id,reason:reason.value as MailReportReason}:
      kind==='block'?{action:'block',mailId:row.id}:{action:'delete',mailId:row.id,sent:row.outgoing===true};
    await mailRepository.send(owner,data);
    if(shell.open){shell.close();completed();}
  })));
  return shell;
}

export function adminMailConsole(owner:string,closed:()=>void) {
  const {shell,content,status,run}=dialog('Quản Trị Hộp Thư',closed);
  shell.classList.add('mail-admin');
  const preview=node('article'), history=node('section');
  const showDraft=(draft:OfficialDraft)=>{
    preview.replaceChildren(node('h3',draft.subject),node('p',draft.body),
      node('p',draft.broadcast?'Người nhận: toàn server':`Người nhận (${draft.recipients.length}): ${draft.recipients.join(', ')}`),
      node('p',`Gửi: ${draft.sendAt?new Date(draft.sendAt).toLocaleString('vi-VN'):'Khi duyệt'} · Hết hạn: ${draft.expiresAt?new Date(draft.expiresAt).toLocaleString('vi-VN'):'Không'}`),
      node('p',Object.entries(draft.rewards).map(([id,value])=>`${MAIL_REWARD_LABELS[id as keyof typeof MAIL_REWARD_LABELS]} ×${value}`).join(' · ')||'Không có đính kèm'));
  };
  let access:{author?:boolean;approver?:boolean};
  const loadHistory=async()=>{
    const result=await mailRepository.send(owner,{action:'adminHistory'});
    if(!shell.open)return;
    history.replaceChildren(node('h3','Lịch sử duyệt và gửi'));
    for(const draft of result.drafts??[]){
      const row=node('div'); row.className='mail-admin-history-row';
      row.append(node('span',`${draft.payload.subject} · ${draft.mail_id?'Đã duyệt':'Chờ duyệt'}`),button('Xem',()=>showDraft(draft.payload)));
      if(access.approver&&draft.author_uid!==owner&&!draft.mail_id){
        row.append(button('Duyệt và gửi',()=>{
          showDraft(draft.payload);
          preview.append(button('Xác nhận phát thư',()=>void run(async()=>{
            await mailRepository.send(owner,{action:'adminApprove',draftId:draft.id});
            await loadHistory(); status.textContent='Đã duyệt phát thư.';
          })));
          preview.scrollIntoView({block:'start'});
        }));
      }
      history.append(row);
    }
  };
  void run(async()=>{
    access=await mailRepository.send(owner,{action:'adminAccess'});
    if(!shell.open)return;
    if(!access.author&&!access.approver)throw Error('Tài khoản không có quyền quản trị thư.');
    if(access.author){
      const form=node('form'), broadcast=input('checkbox'), recipients=box(3900), subject=input(), body=box(2400);
      const sendAt=input('datetime-local'), expiresAt=input('datetime-local');
      recipients.required=false; recipients.rows=2; subject.required=true;
      const rewards=node('div'); rewards.className='mail-admin-rewards';
      const inputs=MAIL_ITEMS.map(id=>{const quantity=input('number');quantity.min='0';quantity.step='1';
        rewards.append(field(MAIL_REWARD_LABELS[id],quantity));return [id,quantity] as const;});
      const time=(value:HTMLInputElement)=>value.value?new Date(value.value).toISOString():undefined;
      const read=()=>parseOfficialDraft({broadcast:broadcast.checked,recipients:recipients.value.split(/[\s,]+/).filter(Boolean),
        subject:subject.value,body:body.value,sendAt:time(sendAt),expiresAt:time(expiresAt),
        rewards:Object.fromEntries(inputs.filter(([,quantity])=>quantity.value&&quantity.value!=='0').map(([id,quantity])=>[id,quantity.valueAsNumber]))});
      let pending:{draft:string;requestId:string}|undefined;
      form.append(field('Toàn server',broadcast),field('UID người nhận, ngăn bằng dấu phẩy',recipients),field('Tiêu đề',subject),field('Nội dung',body),
        field('Giờ gửi (giờ thiết bị)',sendAt),field('Hết hạn (giờ thiết bị)',expiresAt),rewards,button('Xem trước',()=>{},'submit'));
      form.addEventListener('submit',event=>{event.preventDefault();void run(async()=>{
        const draft=read(); if(!draft)throw Error('Kiểm tra người nhận, thời gian, nội dung và số lượng quà.');
        const signature=JSON.stringify(draft);
        if(pending?.draft!==signature)pending={draft:signature,requestId:crypto.randomUUID()};
        const requestId=pending.requestId;
        showDraft(draft); status.textContent='Kiểm tra nội dung xem trước.';
        preview.append(button('Lưu và gửi duyệt',()=>void run(async()=>{
          await mailRepository.send(owner,{action:'adminDraft',requestId,draft});
          preview.replaceChildren();await loadHistory();status.textContent='Đã lưu bản chờ duyệt.';
        })));
        preview.scrollIntoView({block:'start'});
      });});
      content.append(form);
    }
    content.append(preview,history);await loadHistory();status.textContent='';
  });
  return shell;
}
