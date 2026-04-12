import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail({
  to,
  name,
  inviteLink,
}: {
  to: string;
  name: string;
  inviteLink: string;
}): Promise<{ error?: string }> {
  const { error } = await resend.emails.send({
    from: "Stoqlab <noreply@stoqlab.com.br>",
    to,
    subject: "Você foi convidado para o Stoqlab",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
        <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <span style="color: white; font-size: 22px; font-weight: 700;">Stoqlab</span>
        </div>
        <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">Olá, ${name}!</p>
          <p style="margin: 0 0 24px; font-size: 14px; color: #475569;">
            Você foi convidado para acessar o Stoqlab. Clique no botão abaixo para criar sua senha e entrar no sistema.
          </p>
          <a href="${inviteLink}"
            style="display: inline-block; background: #2563eb; color: white; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Criar minha senha
          </a>
          <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
            O link expira em 24 horas. Se você não esperava este e-mail, pode ignorá-lo.
          </p>
        </div>
      </div>
    `,
  });

  if (error) return { error: error.message };
  return {};
}
