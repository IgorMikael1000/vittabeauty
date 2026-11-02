import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  MessageCircle,
  Scissors,
  Sparkles,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";
import { ProductVideoShowcase } from "@/components/landing/product-video-showcase";
import styles from "./landing-page.module.css";

const features = [
  {
    icon: CalendarDays,
    title: "Agendamento online",
    description:
      "Compartilhe seu link para as clientes consultarem serviços e horários disponíveis e solicitarem um horário — sem precisar criar conta.",
  },
  {
    icon: CalendarDays,
    title: "Agenda profissional",
    description:
      "Visualize compromissos por dia, semana ou mês; confirme ou cancele solicitações e acompanhe os atendimentos.",
  },
  {
    icon: Clock3,
    title: "Disponibilidade personalizada",
    description:
      "Configure dias e horários de funcionamento, pausas e bloqueios na agenda.",
  },
  {
    icon: Scissors,
    title: "Cadastro de serviços",
    description:
      "Organize procedimentos com descrição, preço, duração, custo de materiais e sinal.",
  },
  {
    icon: UsersRound,
    title: "Gestão de clientes",
    description:
      "Cadastre contatos, pesquise por nome ou WhatsApp e consulte preferências, observações e histórico de atendimentos.",
  },
  {
    icon: MessageCircle,
    title: "Atalhos para WhatsApp",
    description:
      "Envie mensagens prontas de confirmação, lembrete, agradecimento e recebimento da solicitação.",
  },
  {
    icon: Wallet,
    title: "Controle financeiro",
    description:
      "Registre receitas e despesas e acompanhe valores previstos ou recebidos, custos e lucro.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Relatórios do negócio",
    description:
      "Consulte faturamento, atendimentos, cancelamentos e serviços mais realizados.",
  },
  {
    icon: UserRound,
    title: "Perfil profissional",
    description:
      "Mantenha seus dados de contato e informações profissionais atualizados.",
  },
];

const steps = [
  {
    number: "01",
    title: "Monte seu espaço",
    description: "Cadastre seus serviços, preços e horários de atendimento.",
  },
  {
    number: "02",
    title: "Compartilhe seu link",
    description: "Envie sua página para as clientes pelo WhatsApp ou Instagram.",
  },
  {
    number: "03",
    title: "Cuide do que importa",
    description: "Acompanhe os agendamentos e tenha sua rotina mais organizada.",
  },
];

export function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link aria-label="Vitta Beauty, início" className={styles.brand} href="/">
            <Image
              alt="Vitta Beauty"
              height={180}
              priority
              src="/brand/logo_vitta.png"
              width={320}
            />
          </Link>
          <nav aria-label="Navegação principal" className={styles.navigation}>
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">O que você ganha</a>
            <Link className={styles.loginLink} href="/login">
              Já tenho conta
            </Link>
            <Link className={styles.navCta} href="/cadastro">
              Quero conhecer <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section aria-labelledby="hero-title" className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <Sparkles aria-hidden="true" size={15} />
                PARA PROFISSIONAIS DA BELEZA
              </span>
              <h1 id="hero-title">
                Seu talento merece uma <em>agenda à altura.</em>
              </h1>
              <p className={styles.heroDescription}>
                Organize seus serviços, compartilhe seu link de agendamento e
                deixe sua rotina mais leve — para você cuidar de cada cliente
                com a atenção que ela merece.
              </p>
              <div className={styles.heroActions}>
                <Link className={styles.primaryButton} href="/cadastro">
                  Quero organizar minha rotina
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
                <a className={styles.secondaryButton} href="#como-funciona">
                  Ver como funciona <ArrowDown aria-hidden="true" size={16} />
                </a>
              </div>
              <div className={styles.heroNote}>
                <span className={styles.noteCheck}>
                  <Check aria-hidden="true" size={13} />
                </span>
                Seu espaço profissional começa do seu jeito.
              </div>
            </div>

            <div
              aria-label="Demonstração de uma agenda profissional e uma página de agendamento no celular"
              className={styles.productStage}
            >
              <div className={styles.stageHalo} />
              <div className={styles.agendaCard}>
                <div className={styles.agendaTop}>
                  <div>
                    <span className={styles.mockLabel}>SUA AGENDA</span>
                    <strong>Quarta-feira, 12</strong>
                  </div>
                  <span className={styles.agendaCalendar}>
                    <CalendarDays aria-hidden="true" size={17} />
                  </span>
                </div>
                <div className={styles.agendaSchedule}>
                  <span className={styles.time}>09:00</span>
                  <div className={styles.appointment}>
                    <span className={styles.appointmentDot} />
                    <div>
                      <strong>Design de sobrancelhas</strong>
                      <span>Camila · 50 min</span>
                    </div>
                  </div>
                  <span className={styles.time}>10:30</span>
                  <div className={`${styles.appointment} ${styles.appointmentPink}`}>
                    <span className={styles.appointmentDot} />
                    <div>
                      <strong>Manicure em gel</strong>
                      <span>Julia · 1h 20min</span>
                    </div>
                  </div>
                </div>
                <div className={styles.agendaFooter}>
                  <span className={styles.liveDot} />
                  Seus horários em um só lugar
                </div>
              </div>

              <div className={styles.phone}>
                <div className={styles.phoneSpeaker} />
                <div className={styles.phoneScreen}>
                  <div className={styles.phoneStatus}>
                    <span>9:41</span>
                    <span className={styles.phoneSignal}>● ● ●</span>
                  </div>
                  <div className={styles.bookingHeader}>
                    <div className={styles.avatar}>M</div>
                    <div>
                      <strong>Marina Alves</strong>
                      <span>Especialista em beleza</span>
                    </div>
                  </div>
                  <div className={styles.bookingIntro}>
                    <span>SEU MOMENTO DE CUIDADO</span>
                    <h2>Escolha seu serviço</h2>
                    <p>Encontre o cuidado ideal para você.</p>
                  </div>
                  <div className={styles.serviceOption}>
                    <div className={styles.serviceIcon}>
                      <Sparkles aria-hidden="true" size={16} />
                    </div>
                    <div className={styles.serviceDetails}>
                      <strong>Design de sobrancelhas</strong>
                      <span>
                        <Clock3 aria-hidden="true" size={12} /> 50 min
                      </span>
                    </div>
                    <strong className={styles.servicePrice}>R$ 45</strong>
                  </div>
                  <div className={styles.serviceOption}>
                    <div className={`${styles.serviceIcon} ${styles.serviceIconPink}`}>
                      <HeartMark />
                    </div>
                    <div className={styles.serviceDetails}>
                      <strong>Manicure em gel</strong>
                      <span>
                        <Clock3 aria-hidden="true" size={12} /> 1h 20min
                      </span>
                    </div>
                    <strong className={styles.servicePrice}>R$ 90</strong>
                  </div>
                  <div className={styles.dateLabel}>PRÓXIMOS HORÁRIOS</div>
                  <div className={styles.timeChoices}>
                    <span>Qua, 12</span>
                    <strong>09:00</strong>
                    <strong className={styles.selectedTime}>10:30</strong>
                    <strong>14:00</strong>
                  </div>
                  <div className={styles.phoneButton}>
                    Continuar <ChevronRight aria-hidden="true" size={15} />
                  </div>
                  <div className={styles.phoneBrand}>Agendamento feito com carinho ✦ Vitta</div>
                </div>
              </div>

              <div className={styles.floatingBadge}>
                <span className={styles.badgeIcon}>
                  <Check aria-hidden="true" size={16} />
                </span>
                <span>
                  <strong>Agendamento organizado</strong>
                  <small>Sem troca de mensagens</small>
                </span>
              </div>
              <span className={styles.stageCaption}>Uma prévia do seu espaço profissional</span>
            </div>
          </div>
        </section>

        <section aria-label="Resumo da proposta" className={styles.promise}>
          <div className={styles.promiseInner}>
            <span className={styles.promiseFlower}>✳</span>
            <p>
              Menos tempo organizando conversas. <strong>Mais tempo fazendo o que você ama.</strong>
            </p>
            <span className={styles.promiseDivider} />
            <span className={styles.promiseAside}>Seu trabalho merece esse cuidado.</span>
          </div>
        </section>

        <section aria-labelledby="pain-title" className={styles.painSection}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>A GENTE SABE COMO É</span>
            <h2 id="pain-title">
              Você cuida de todo mundo.
              <br />
              <em>Quem cuida da sua rotina?</em>
            </h2>
            <p>
              Entre um atendimento e outro, ainda tem mensagem para responder,
              horário para confirmar e informação para encontrar.
            </p>
          </div>
          <div className={styles.painCards}>
            <article className={styles.painCard}>
              <span className={styles.painNumber}>01</span>
              <p>“Tem horário essa semana?” — de novo e de novo.</p>
            </article>
            <article className={styles.painCard}>
              <span className={styles.painNumber}>02</span>
              <p>Qual era mesmo o serviço, o valor e o horário combinado?</p>
            </article>
            <article className={styles.painCard}>
              <span className={styles.painNumber}>03</span>
              <p>Seu dia cheio de talento, mas também de tarefas repetidas.</p>
            </article>
          </div>
          <p className={styles.turnaround}>
            <Sparkles aria-hidden="true" size={17} />
            <strong>O Vitta Beauty ajuda a deixar essa parte mais simples.</strong>
          </p>
        </section>

        <section aria-labelledby="how-title" className={styles.howSection} id="como-funciona">
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>SIMPLES PARA VOCÊ. FÁCIL PARA ELAS.</span>
            <h2 id="how-title">
              Do seu espaço ao agendamento,
              <br />
              <em>sem complicar.</em>
            </h2>
            <p>
              Uma experiência organizada para a profissional e acolhedora para
              quem agenda.
            </p>
          </div>
          <div className={styles.steps}>
            {steps.map((step, index) => (
              <article className={styles.step} key={step.number}>
                <div className={styles.stepTop}>
                  <span>{step.number}</span>
                  {index < steps.length - 1 && <span className={styles.stepLine} />}
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="video-title"
          className={styles.videoSection}
          id="demonstracao"
        >
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>VEJA O VITTA EM AÇÃO</span>
            <h2 id="video-title">
              Um tour real pelo seu espaço,
              <br />
              <em>direto do celular.</em>
            </h2>
            <p>
              Escolha uma etapa e veja como a rotina funciona na prática — com
              gravações reais do aplicativo.
            </p>
          </div>
          <ProductVideoShowcase />
        </section>

        <section aria-labelledby="features-title" className={styles.featuresSection} id="recursos">
          <div className={styles.featureHeading}>
            <span className={styles.eyebrow}>SEU TRABALHO, COM MAIS LEVEZA</span>
            <h2 id="features-title">
              Tudo que ajuda sua rotina
              <br />
              <em>a fluir melhor.</em>
            </h2>
            <p>
              Da primeira solicitação ao fechamento do mês: um espaço para
              organizar as partes importantes do seu trabalho.
            </p>
          </div>
          <div className={styles.benefitList}>
            {features.map(({ icon: Icon, title, description }, index) => (
              <article className={styles.benefit} key={title}>
                <span className={styles.benefitIcon}>
                  <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
                </span>
                <div>
                  <span className={styles.benefitIndex}>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="deposit-title" className={styles.depositSection} id="sinal">
          <div className={styles.depositCopy}>
            <span className={styles.eyebrow}>VOCÊ ESCOLHE COMO TRABALHAR</span>
            <h2 id="deposit-title">
              Mais tranquilidade
              <br />
              <em>na hora do sinal.</em>
            </h2>
            <p>
              Se quiser pedir um sinal para confirmar o horário, o Vitta oferece
              caminhos diferentes para você escolher o que combina com sua rotina.
            </p>
            <Link className={styles.textLink} href="/#como-funciona">
              Veja como funciona <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
          <div className={styles.depositOptions}>
            <article className={styles.depositOption}>
              <span className={styles.depositIcon}>
                <CreditCard aria-hidden="true" size={20} />
              </span>
              <div>
                <span className={styles.optionTag}>AUTOMÁTICO</span>
                <h3>Conecte o Mercado Pago</h3>
                <p>
                  A cliente paga online e a confirmação do pagamento é integrada
                  ao agendamento.
                </p>
              </div>
              <ChevronRight aria-hidden="true" className={styles.optionArrow} size={18} />
            </article>
            <article className={styles.depositOption}>
              <span className={`${styles.depositIcon} ${styles.depositIconPink}`}>
                <Wallet aria-hidden="true" size={20} />
              </span>
              <div>
                <span className={`${styles.optionTag} ${styles.optionTagPink}`}>MANUAL</span>
                <h3>Use sua chave Pix</h3>
                <p>
                  Escolha uma chave Pix e confira o pagamento manualmente na sua
                  conta.
                </p>
              </div>
              <ChevronRight aria-hidden="true" className={styles.optionArrow} size={18} />
            </article>
            <p className={styles.depositFootnote}>
              A disponibilidade e as condições de pagamento dependem da
              configuração da profissional e do provedor utilizado.
            </p>
          </div>
        </section>

        <section aria-labelledby="cta-title" className={styles.finalCta}>
          <div className={styles.ctaDecoration} />
          <span className={styles.ctaSparkle}>✳</span>
          <span className={styles.ctaEyebrow}>UM CUIDADO A MAIS COM VOCÊ</span>
          <h2 id="cta-title">
            Pronta para deixar
            <br />
            sua rotina mais leve?
          </h2>
          <p>
            Seu talento já transforma o dia de alguém.
            <br />
            O Vitta pode ajudar a cuidar do resto.
          </p>
          <Link className={styles.ctaButton} href="/cadastro">
            Quero conhecer o Vitta Beauty
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <span className={styles.ctaFootnote}>Leve seu trabalho para um espaço feito para você.</span>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link aria-label="Vitta Beauty, voltar ao início" className={styles.footerBrand} href="/">
          <Image alt="Vitta Beauty" height={115} src="/brand/logo_vitta.png" width={205} />
        </Link>
        <p>Seu trabalho merece cuidado. Sua rotina também.</p>
        <div className={styles.footerLinks}>
          <Link href="/termos">Termos e privacidade</Link>
          <Link href="/login">Entrar</Link>
          <Link href="/cadastro">Criar meu espaço</Link>
        </div>
        <span className={styles.footerCopyright}>© Vitta Beauty</span>
      </footer>
    </div>
  );
}

function HeartMark() {
  return (
    <span aria-hidden="true" className={styles.heartMark}>
      ✦
    </span>
  );
}
