import {
  BookOpen,
  Clock,
  Database,
  Gauge,
  Layers,
  Lock,
  Smartphone,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Glass } from "@/components/home/Glass";
import { ATTRIBUTION, CACHE_TTL_SECONDS, FRESHNESS, LOCATION, OFFICIAL_ALERT_SOURCES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sobre e fontes",
  description: "De onde vêm os dados, como ler a previsão e quais são as limitações deste site.",
};

const WHO_UV_GUIDE = "https://www.who.int/publications/i/item/9241590076";

/** 30 → "30 min"; 180 → "3 h". */
const duration = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${minutes / 60} h`);

export default function AboutPage() {
  const { openMeteo } = ATTRIBUTION;

  return (
    <div className="relative isolate flex-1 bg-gradient-to-b from-slate-900 to-slate-800">
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-12 pt-8 lg:pt-12">
        <Glass as="div" className="enter-up p-6 sm:p-8">
          <h1 className="display font-bold">Sobre e fontes</h1>
          <p className="mt-3 text-base leading-relaxed">
            Este site mostra condições atuais e previsão do tempo para {LOCATION.name} –{" "}
            {LOCATION.state}. É um projeto de portfólio, sem fins comerciais, e{" "}
            <strong>não é um serviço meteorológico oficial</strong>.
          </p>
        </Glass>

        <Section id="tres-coisas" title="Previsão, alertas e clima: três coisas diferentes" icon={Layers}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kind
              title="Previsão do tempo"
              scale="Horas a 7 dias"
              accent="border-sky-400"
              text="Estimativa feita por modelos numéricos de computador. Pode errar, e a incerteza aumenta para os dias mais distantes. É o que este site mostra."
            />
            <Kind
              title="Alertas oficiais"
              scale="Eventos perigosos iminentes"
              accent="border-red-400"
              text="Emitidos por órgãos públicos, como o INMET e a Defesa Civil. Este site não emite, não resume e não verifica alertas: só indica onde consultá-los."
            />
            <Kind
              title="Contexto climático (El Niño)"
              scale="Meses, oceano Pacífico"
              accent="border-orange-400"
              text="Padrão climático de grande escala que altera probabilidades ao longo de meses. Não serve para explicar um dia de chuva ou de calor específico em Cascavel."
              link={{ href: "/el-nino", label: "Entenda o El Niño e a situação atual" }}
            />
          </div>
        </Section>

        <Section id="origem" title="De onde vêm os dados" icon={Database}>
          <P>
            Os dados vêm do <A href={openMeteo.url}>Open-Meteo</A>, serviço que reúne modelos de
            previsão de institutos meteorológicos nacionais e internacionais, como o ECMWF (Europa),
            a NOAA (Estados Unidos) e o DWD (Alemanha). Por padrão, o Open-Meteo escolhe
            automaticamente o modelo de maior resolução disponível para a localização. O serviço não
            informa qual modelo foi usado em cada previsão, então este site também não informa.
          </P>
          <P>
            O modelo calcula valores para pontos de uma grade. O ponto usado para Cascavel pode ficar
            a alguns quilômetros do centro da cidade e ter altitude um pouco diferente.
          </P>
        </Section>

        <Section id="como-ler" title="Como ler os números" icon={Gauge}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Term name="Agora">
              Estimativa de modelo em intervalos de 15 minutos, <strong>não</strong> medição de
              estação meteorológica. Pode ser diferente do que você vê na rua ou em um termômetro.
            </Term>
            <Term name="Temperatura e sensação térmica">
              Temperatura do ar a 2 metros do solo. A sensação térmica é calculada pelo modelo
              combinando a temperatura com efeitos como vento e umidade.
            </Term>
            <Term name="Vento">
              Velocidade média a 10 metros de altura. A direção indica <em>de onde</em> o vento sopra:
              &quot;de N&quot; é vento vindo do norte. O gráfico mostra a previsão para as próximas horas.
            </Term>
            <Term name="Chance de chuva por hora">
              Probabilidade de cair mais de 0,1 mm na hora que <em>termina</em> no horário indicado. O
              item &quot;16h&quot; se refere ao período das 15h às 16h.
            </Term>
            <Term name="Chuva por dia">
              Total previsto para o dia inteiro (para hoje, inclui as horas que já passaram) e a maior
              probabilidade horária do dia.
            </Term>
            <Term name="Índice UV">
              Máximo previsto para o dia, arredondado e classificado pela escala da OMS: baixo (0–2),
              moderado (3–5), alto (6–7), muito alto (8–10) e extremo (11 ou mais).
            </Term>
            <Term name="Sol hoje">
              Horários de nascer e pôr do sol calculados pelo provedor, com a posição atual do sol entre
              os dois.
            </Term>
            <Term name="—">O provedor não informou esse valor. Nunca é substituído por zero.</Term>
          </dl>
          <P>Todos os horários estão no fuso de Cascavel (horário de Brasília, UTC−3).</P>
        </Section>

        <Section id="atualizacao" title="Atualização e dados desatualizados" icon={Clock}>
          <P>
            Os dados ficam guardados no servidor e são compartilhados entre todas as visitas: o site
            busca dados novos no máximo a cada {duration(CACHE_TTL_SECONDS / 60)}, não importa quantas
            pessoas acessem. Depois de cada nova publicação do site, a primeira visita busca dados novos.
          </P>
          <P>Cada bloco mostra o horário a que os dados se referem e há quanto tempo foram obtidos:</P>
          <ul className="mt-3 space-y-2">
            <Item>
              <strong>Condições atuais:</strong> aviso de possível desatualização após{" "}
              {duration(FRESHNESS.current.staleAfterMin)}; deixam de ser exibidas após{" "}
              {duration(FRESHNESS.current.expiredAfterMin)}.
            </Item>
            <Item>
              <strong>Previsão:</strong> aviso após {duration(FRESHNESS.forecast.staleAfterMin)}; deixa
              de ser exibida após {duration(FRESHNESS.forecast.expiredAfterMin)}.
            </Item>
            <Item>
              Se o provedor falhar, continuamos mostrando os últimos dados obtidos, com o horário real
              deles e os avisos acima quando ficarem velhos. Sem nenhum dado disponível, mostramos
              &quot;indisponível&quot;, nunca valores de exemplo.
            </Item>
          </ul>
        </Section>

        <Section id="limitacoes" title="Limitações" icon={TriangleAlert} iconColor="text-amber-300">
          <ul className="space-y-2">
            <Item>
              Tempestades isoladas e chuvas muito localizadas são difíceis de prever com precisão: pode
              chover em um bairro e não em outro.
            </Item>
            <Item>Quanto mais distante o dia da previsão, maior a incerteza.</Item>
            <Item>
              O site cobre apenas {LOCATION.name} – {LOCATION.state} e não tem histórico, radar nem
              mapas.
            </Item>
            <Item>Em situações de risco, siga sempre as orientações dos órgãos oficiais.</Item>
          </ul>
        </Section>

        <Section id="fontes" title="Fontes e licenças" icon={BookOpen}>
          <ul className="space-y-2">
            <Item>
              Dados meteorológicos: <A href={openMeteo.url}>Open-Meteo.com</A>, licença{" "}
              <A href={openMeteo.licenseUrl}>{openMeteo.license}</A>. Os valores são arredondados e os
              textos traduzidos para exibição.
            </Item>
            <Item>
              Escala do Índice UV: <A href={WHO_UV_GUIDE}>OMS, Global Solar UV Index: a practical guide</A>.
            </Item>
            <Item>
              Visual inspirado em{" "}
              <A href="https://dribbble.com/shots/25898869-Weather-Forecasting-Web-Design">
                Weather &amp; Forecasting Web Design
              </A>
              , do Gapsy Studio. As ilustrações deste site são próprias, desenhadas em código.
            </Item>
            {OFFICIAL_ALERT_SOURCES.map((source) => (
              <Item key={source.url}>
                <A href={source.url}>{source.name}</A>
              </Item>
            ))}
          </ul>
        </Section>

        <Section id="instalar" title="Usar como aplicativo no celular" icon={Smartphone}>
          <P>
            O site pode ser instalado na tela inicial e abre em tela cheia, como um aplicativo. Não é
            preciso loja de aplicativos nem cadastro.
          </P>
          <ul className="mt-3 space-y-2">
            <Item>
              <strong>Android (Chrome):</strong> menu ⋮ → <strong>Instalar app</strong> (ou
              “Adicionar à tela inicial”).
            </Item>
            <Item>
              <strong>iPhone (Safari):</strong> botão Compartilhar → <strong>Adicionar à Tela de Início</strong>.
            </Item>
            <Item>
              <strong>Computador (Chrome ou Edge):</strong> ícone de instalar na barra de endereço.
            </Item>
          </ul>
          <P>
            Sem internet, o app mostra um aviso em vez de dados antigos: nenhuma previsão fica guardada
            no aparelho.
          </P>
        </Section>

        <Section id="privacidade" title="Privacidade" icon={Lock}>
          <P>
            Este site não usa cookies, não tem login e não coleta dados pessoais. A hospedagem pode
            registrar dados técnicos de acesso, como endereço IP, em logs de servidor. O aplicativo
            instalado guarda no aparelho só os arquivos do visual do site (não dados pessoais nem
            previsões).
          </P>
        </Section>
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  iconColor = "text-sky-300",
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: ReactNode;
}) {
  return (
    <Glass labelledBy={id} className="reveal p-6 sm:p-7">
      <h2 id={id} className="headline flex items-center gap-2 font-bold">
        <Icon aria-hidden="true" className={`size-6 shrink-0 ${iconColor}`} />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Glass>
  );
}

function Kind({
  title,
  scale,
  text,
  accent,
  link,
}: {
  title: string;
  scale: string;
  text: string;
  accent: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className={`glass-inner rounded-2xl border-t-4 p-4 ring-1 ring-white/20 ${accent}`}>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-white/90">{scale}</p>
      <p className="mt-2 text-sm">{text}</p>
      {link && (
        <Link href={link.href} className="mt-2 inline-block text-sm font-bold underline underline-offset-2">
          {link.label} →
        </Link>
      )}
    </div>
  );
}

function Term({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="glass-inner rounded-2xl p-4 ring-1 ring-white/20">
      <dt className="font-bold">{name}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function Item({ children }: { children: ReactNode }) {
  return <li className="glass-inner rounded-2xl border-l-4 border-sky-400 p-3 text-sm ring-1 ring-white/20">{children}</li>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-base leading-relaxed first:mt-0">{children}</p>;
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
      {children}
    </a>
  );
}
