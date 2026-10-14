import type { Metadata } from "next";
import Link from "next/link";
import { ATTRIBUTION, CACHE_TTL_SECONDS, FRESHNESS, LOCATION, OFFICIAL_ALERT_SOURCES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sobre e fontes",
  description: "De onde vêm os dados, como ler a previsão e quais são as limitações deste site.",
};

/** 30 → "30 min"; 180 → "3 h". */
const duration = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${minutes / 60} h`);

export default function AboutPage() {
  const { openMeteo } = ATTRIBUTION;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-10 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Sobre e fontes</h1>
      <p className="mt-2 text-sm text-zinc-700">
        Este site mostra condições atuais e previsão do tempo para {LOCATION.name} –{" "}
        {LOCATION.state}. É um projeto de portfólio, sem fins comerciais, e{" "}
        <strong>não é um serviço meteorológico oficial</strong>.
      </p>

      <Section id="tres-coisas" title="Previsão, alertas e clima: três coisas diferentes">
        <div className="grid gap-3">
          <Kind
            title="Previsão do tempo"
            scale="Horas a 7 dias"
            text="Estimativa feita por modelos numéricos de computador. Pode errar, e a incerteza aumenta para os dias mais distantes. É o que este site mostra."
          />
          <Kind
            title="Alertas oficiais"
            scale="Eventos perigosos iminentes"
            text="Emitidos por órgãos públicos, como o INMET e a Defesa Civil. Este site não emite, não resume e não verifica alertas: só indica onde consultá-los."
          />
          <Kind
            title="Contexto climático (El Niño)"
            scale="Meses, oceano Pacífico"
            text="Padrão climático de grande escala que altera probabilidades ao longo de meses. Não serve para explicar um dia de chuva ou de calor específico em Cascavel."
            link={{ href: "/el-nino", label: "Entenda o El Niño e a situação atual" }}
          />
        </div>
      </Section>

      <Section id="origem" title="De onde vêm os dados">
        <P>
          Os dados vêm do{" "}
          <A href={openMeteo.url}>Open-Meteo</A>, serviço que reúne modelos de previsão de
          institutos meteorológicos nacionais e internacionais, como o ECMWF (Europa), a NOAA
          (Estados Unidos) e o DWD (Alemanha). Por padrão, o Open-Meteo escolhe automaticamente o
          modelo de maior resolução disponível para a localização. O serviço não informa qual
          modelo foi usado em cada previsão, então este site também não informa.
        </P>
        <P>
          O modelo calcula valores para pontos de uma grade. O ponto usado para Cascavel pode
          ficar a alguns quilômetros do centro da cidade e ter altitude um pouco diferente.
        </P>
      </Section>

      <Section id="como-ler" title="Como ler os números">
        <dl className="space-y-3 text-sm">
          <Term name="Agora">
            Estimativa de modelo em intervalos de 15 minutos, <strong>não</strong> medição de
            estação meteorológica. Pode ser diferente do que você vê na rua ou em um termômetro.
          </Term>
          <Term name="Temperatura e sensação térmica">
            Temperatura do ar a 2 metros do solo. A sensação térmica é calculada pelo modelo
            combinando a temperatura com efeitos como vento e umidade.
          </Term>
          <Term name="Vento">
            Velocidade média a 10 metros de altura. A direção indica <em>de onde</em> o vento
            sopra: &quot;de N&quot; é vento vindo do norte.
          </Term>
          <Term name="Chuva (últimos 15 min)">Total estimado nos 15 minutos anteriores.</Term>
          <Term name="Chance de chuva por hora">
            Probabilidade de cair mais de 0,1 mm na hora que <em>termina</em> no horário indicado.
            O item &quot;16h&quot; se refere ao período das 15h às 16h.
          </Term>
          <Term name="Chuva por dia">
            Total previsto para o dia inteiro (para hoje, inclui as horas que já passaram) e a
            maior probabilidade horária do dia.
          </Term>
          <Term name="—">O provedor não informou esse valor. Nunca é substituído por zero.</Term>
        </dl>
        <P>Todos os horários estão no fuso de Cascavel (horário de Brasília, UTC−3).</P>
      </Section>

      <Section id="atualizacao" title="Atualização e dados desatualizados">
        <P>
          O site busca dados novos no máximo a cada {duration(CACHE_TTL_SECONDS / 60)}. Cada bloco
          mostra o horário a que os dados se referem e há quanto tempo foram obtidos:
        </P>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-zinc-700">
          <li>
            <strong>Condições atuais:</strong> aviso de possível desatualização após{" "}
            {duration(FRESHNESS.current.staleAfterMin)}; deixam de ser exibidas após{" "}
            {duration(FRESHNESS.current.expiredAfterMin)}.
          </li>
          <li>
            <strong>Previsão:</strong> aviso após {duration(FRESHNESS.forecast.staleAfterMin)};
            deixa de ser exibida após {duration(FRESHNESS.forecast.expiredAfterMin)}.
          </li>
          <li>
            Se o provedor falhar, mostramos os últimos dados obtidos com um aviso e o horário
            real deles. Sem nenhum dado disponível, mostramos &quot;indisponível&quot;, nunca
            valores de exemplo.
          </li>
        </ul>
      </Section>

      <Section id="limitacoes" title="Limitações">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-700">
          <li>
            Tempestades isoladas e chuvas muito localizadas são difíceis de prever com precisão:
            pode chover em um bairro e não em outro.
          </li>
          <li>Quanto mais distante o dia da previsão, maior a incerteza.</li>
          <li>
            O site cobre apenas {LOCATION.name} – {LOCATION.state} e não tem histórico, radar nem
            mapas.
          </li>
          <li>Em situações de risco, siga sempre as orientações dos órgãos oficiais.</li>
        </ul>
      </Section>

      <Section id="fontes" title="Fontes e licenças">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-700">
          <li>
            Dados meteorológicos: <A href={openMeteo.url}>Open-Meteo.com</A>, licença{" "}
            <A href={openMeteo.licenseUrl}>{openMeteo.license}</A>. Os valores são arredondados e
            os textos traduzidos para exibição.
          </li>
          {OFFICIAL_ALERT_SOURCES.map((source) => (
            <li key={source.url}>
              <A href={source.url}>{source.name}</A>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="privacidade" title="Privacidade">
        <P>
          Este site não usa cookies, não tem login e não coleta dados pessoais. A hospedagem pode
          registrar dados técnicos de acesso, como endereço IP, em logs de servidor.
        </P>
      </Section>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-lg font-semibold text-zinc-900">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Kind({
  title,
  scale,
  text,
  link,
}: {
  title: string;
  scale: string;
  text: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <p className="text-xs text-zinc-600">{scale}</p>
      <p className="mt-2 text-sm text-zinc-700">{text}</p>
      {link && (
        <Link href={link.href} className="mt-2 inline-block text-sm font-medium text-sky-800 underline underline-offset-2">
          {link.label} →
        </Link>
      )}
    </div>
  );
}

function Term({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-zinc-900">{name}</dt>
      <dd className="text-zinc-700">{children}</dd>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-zinc-700 first:mt-0">{children}</p>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-800 underline underline-offset-2">
      {children}
    </a>
  );
}
