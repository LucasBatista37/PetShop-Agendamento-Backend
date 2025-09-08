exports.generateVerificationEmail = (name, verifyUrl) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #4f46e5;">Olá, ${name}!</h2>
    <p>Obrigado por se cadastrar no <strong>PetCare</strong>.</p>
    <p>Para ativar sua conta, clique no botão abaixo:</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Confirmar E-mail
      </a>
    </p>
    <p>Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all;">${verifyUrl}</p>
    <hr style="margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">
      Se você não se registrou no PetCare, pode ignorar este e-mail.
    </p>
  </div>
`;

exports.generateResetPasswordEmail = (name, resetUrl) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #4f46e5;">Olá, ${name}!</h2>
    <p>Recebemos um pedido para redefinir sua senha.</p>
    <p>Clique no botão abaixo para criar uma nova senha (válido por 1 hora):</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Redefinir Senha
      </a>
    </p>
    <p>Ou copie e cole este link no navegador:</p>
    <p style="word-break: break-all;">${resetUrl}</p>
    <hr style="margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">
      Se você não solicitou, ignore este e-mail.</p>
  </div>
`;

exports.generateInviteCollaboratorEmail = (inviteUrl) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #4f46e5;">Olá!</h2>
    <p>Você foi convidado para colaborar no sistema <strong>PetCare</strong>.</p>
    <p>Para aceitar o convite, clique no botão abaixo:</p>
    <p style="text-align: center;">
      <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Aceitar Convite
      </a>
    </p>
    <p>Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all;">${inviteUrl}</p>
    <hr style="margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">
      Se você não esperava esse convite, pode ignorar este e-mail.
    </p>
  </div>
`;

exports.generateWelcomeEmail = (name) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #4f46e5;">Bem-vindo ao PetCare, ${name}!</h2>
    <p>Estamos muito felizes em ter você como assinante 🎉</p>
    <p>A partir de agora você terá acesso completo ao nosso sistema de agendamento e gestão PetCare.</p>
    <p>Esperamos que sua experiência seja incrível!</p>
    <hr style="margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">
      Caso tenha dúvidas ou precise de suporte, entre em contato com nossa equipe de atendimento.
    </p>
  </div>
`;