import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "cs@theoktop.com";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: `THE OKTOP <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[sendEmail] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sendEmail] Exception:", message);
    return { success: false, error: message };
  }
}

export function orderFeedbackTemplate(
  customerName: string,
  buildingAddress: string,
  feedbackContent: string
): { subject: string; html: string } {
  return {
    subject: "[THE OKTOP] 의뢰 피드백이 도착했습니다",
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">THE OKTOP</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 24px;font-size:20px;color:#1a1a1a;">의뢰 피드백이 도착했습니다</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;border-radius:6px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f9f9f9;">
                <td style="padding:12px 16px;font-size:13px;color:#666;width:120px;border-bottom:1px solid #e5e5e5;">고객명</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #e5e5e5;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#666;width:120px;border-bottom:1px solid #e5e5e5;">건물 주소</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #e5e5e5;">${buildingAddress}</td>
              </tr>
              <tr style="background:#f9f9f9;">
                <td style="padding:12px 16px;font-size:13px;color:#666;vertical-align:top;">피드백 내용</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;white-space:pre-line;">${feedbackContent}</td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#999;">본 메일은 THE OKTOP 관리 시스템에서 자동 발송되었습니다.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function inquiryReplyTemplate(
  customerName: string,
  inquiryTitle: string,
  replyContent: string
): { subject: string; html: string } {
  return {
    subject: "[THE OKTOP] 문의 답변이 등록되었습니다",
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">THE OKTOP</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">문의 답변이 등록되었습니다</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">${customerName}님, 문의해 주셔서 감사합니다.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;border-radius:6px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f9f9f9;">
                <td style="padding:12px 16px;font-size:13px;color:#666;width:100px;border-bottom:1px solid #e5e5e5;">문의 제목</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #e5e5e5;">${inquiryTitle}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#666;vertical-align:top;">답변 내용</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;white-space:pre-line;">${replyContent}</td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#999;">추가 문의사항은 <a href="https://theoktop.com" style="color:#1a1a1a;">theoktop.com</a>에서 접수하실 수 있습니다.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function newAdminTemplate(
  name: string,
  email: string,
  temporaryPassword: string
): { subject: string; html: string } {
  return {
    subject: "[THE OKTOP] 관리자 계정이 생성되었습니다",
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">THE OKTOP</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">관리자 계정이 생성되었습니다</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">${name}님, 아래 정보로 로그인하신 후 비밀번호를 즉시 변경해 주세요.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;border-radius:6px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f9f9f9;">
                <td style="padding:12px 16px;font-size:13px;color:#666;width:120px;border-bottom:1px solid #e5e5e5;">이름</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #e5e5e5;">${name}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#666;border-bottom:1px solid #e5e5e5;">이메일</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #e5e5e5;">${email}</td>
              </tr>
              <tr style="background:#f9f9f9;">
                <td style="padding:12px 16px;font-size:13px;color:#666;">임시 비밀번호</td>
                <td style="padding:12px 16px;font-size:16px;font-weight:700;color:#1a1a1a;letter-spacing:2px;">${temporaryPassword}</td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#e53e3e;font-weight:600;">보안을 위해 최초 로그인 후 반드시 비밀번호를 변경해 주세요.</p>
            <p style="margin:0;font-size:13px;color:#999;">본 메일은 THE OKTOP 관리 시스템에서 자동 발송되었습니다.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
