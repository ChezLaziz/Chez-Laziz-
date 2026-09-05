import { Link } from 'react-router'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import { analyticsEnabled } from '@/lib/analytics'
import { metaPixelEnabled } from '@/lib/metaPixel'

export default function PrivacyPage() {
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'سياسة الخصوصية — عند لعزيز',
          description: 'سياسة الخصوصية عند لعزيز — القيروان، تونس.',
          path: '/ar/politique-de-confidentialite',
          breadcrumb: 'سياسة الخصوصية',
        }
      : {
          title: 'Politique de confidentialité — Chez Laziz',
          description: 'Politique de confidentialité de Chez Laziz — Kairouan, Tunisie.',
          path: '/politique-de-confidentialite',
          breadcrumb: 'Politique de confidentialité',
        },
  )

  if (isAr) {
    return (
      <div className="min-h-screen bg-[#faf6f3]">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-28 md:px-10 md:py-36">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            Chez Laziz
          </p>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            سياسة الخصوصية
          </h1>
          <p className="mt-4 text-sm text-ink/50">آخر تحديث: سبتمبر 2026</p>

          <div className="mt-10 space-y-8 text-[15px] font-light leading-relaxed text-ink/80">
            <section>
              <h2 className="mb-2 font-display text-xl text-ink">من نحن</h2>
              <p>
                عند لعزيز (Chez Laziz) حرفة صناعة حلويات تقليدية مقرها القيروان، تونس. هذا
                الموقع يُستعمل لعرض منتجاتنا واستقبال طلبات الطلب أو التواصل.
              </p>
              <p className="mt-2">
                للتواصل: <a href="mailto:contact@chezlaziz.com" className="text-accent underline underline-offset-2" dir="ltr">contact@chezlaziz.com</a> · <a href="tel:+21623691039" className="text-accent underline underline-offset-2" dir="ltr">+216 23 691 039</a>
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">شنية المعلومات اللي نجمعوها</h2>
              <p>لما تستعملو استمارة الطلب أو التواصل، نتوصلو بـ:</p>
              <ul className="mt-2 list-disc space-y-1 pr-5">
                <li>اسمكم ورقم هاتفكم</li>
                <li>عنوان التوصيل (الولاية، المدينة، العنوان، الترقيم البريدي)</li>
                <li>تفاصيل طلبيتكم أو رسالتكم</li>
                <li>
                  إذا دفعتو بـ D17: صورة الدفع، تُستعمل فقط للتحقق من العملية
                </li>
              </ul>
              <p className="mt-2">
                ما نطلبوش كلمة سر، ولا بريد إلكتروني، ولا رقم بطاقة بنكية — ما فماش أي دفع
                أونلاين يتم في هذا الموقع (الدفع نقدًا أو تحويل D17 فقط).
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">كيفاش نستعملو هذه المعلومات</h2>
              <p>
                هذه المعلومات تُستعمل فقط لتحضير طلبيتكم وتوصيلها وتأكيدها، للتحقق من دفع
                D17، أو للرد على رسالتكم (بالهاتف أو ماسنجر). تُحفظ في قاعدة بياناتنا لمتابعة
                الطلبيات، وما تُباعش ولا تُشارك مع أي طرف ثالث لأغراض تجارية. صورة الدفع D17
                ما يوصلها إلا فريقنا، ما تُنشر ولا تُشارك أبدًا.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">الكوكيز وقياس الزيارات</h2>
              <p>
                نقيسو عدد الزيارات بعداد مجهول على سيرفرنا الخاص، شغال باستمرار وبلا كوكيز.
              </p>
              {(analyticsEnabled || metaPixelEnabled) && (
                <>
                  <p className="mt-2">
                    بالإضافة لهذا العداد، وفقط إذا دُستو على «موافق» في بانر الكوكيز:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pr-5">
                    {analyticsEnabled && (
                      <li>
                        Google Analytics (عنوان IP مجهول) يعطينا فكرة من وين جايين الزوار
                        وشنية الصفحات اللي يزورو.
                      </li>
                    )}
                    {metaPixelEnabled && (
                      <li>
                        Meta Pixel (فيسبوك/انستغرام) يخلينا نقيسو فعالية إعلاناتنا وما نعاودوش
                        نوروكم إعلان شفتوه ديجا. لما تتأكد الطلبية، رقم هاتفكم يتشفر (يولي غير
                        مقروء وما يترجعش) قبل ما يتبعث لـ Meta باش يربط الشراء بالحملة
                        الإعلانية — أبدًا بشكل واضح، أبدًا اسمكم ولا عنوانكم.
                      </li>
                    )}
                  </ul>
                  <p className="mt-2">
                    في الحالتين، غير المنتجات المطلوبة أو المشاهدة والمبالغ هي اللي تتبعث —
                    أبدًا محتوى الاستمارات (الاسم، العنوان، صورة الدفع). إذا دُستو على
                    «رفض»، ما يتحمّل حتى واحد من هاذوكم الأداتين؛ يبقى غير العداد الداخلي
                    شغال.
                  </p>
                </>
              )}
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">حقوقكم</h2>
              <p>
                تقدرو في أي وقت تطلبو منا نشوفو أو نصلحو أو نمسحو المعلومات اللي عطيتونا
                إياها، بالتواصل معنا مباشرة بالهاتف أو البريد الإلكتروني.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">للتواصل</h2>
              <p>
                لأي سؤال حول معلوماتكم الشخصية، تواصلو معنا على{' '}
                <a href="tel:+21623691039" className="text-accent underline underline-offset-2" dir="ltr">+216 23 691 039</a> أو بالبريد الإلكتروني{' '}
                <a href="mailto:contact@chezlaziz.com" className="text-accent underline underline-offset-2" dir="ltr">contact@chezlaziz.com</a>.
              </p>
            </section>
          </div>

          <Link to="/ar" className="arrow-link mt-14 inline-flex">
            الرجوع للرئيسية
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className="rotate-180">
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-28 md:px-10 md:py-36">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          Chez Laziz
        </p>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          Politique de confidentialité
        </h1>
        <p className="mt-4 text-sm text-ink/50">Dernière mise à jour : septembre 2026</p>

        <div className="mt-10 space-y-8 text-[15px] font-light leading-relaxed text-ink/80">
          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Qui sommes-nous</h2>
            <p>
              Chez Laziz (عند لعزيز) est une pâtisserie artisanale basée à Kairouan,
              Tunisie. Ce site est utilisé pour présenter nos produits et recevoir des
              demandes de commande ou de contact.
            </p>
            <p className="mt-2">
              Contact : <a href="mailto:contact@chezlaziz.com" className="text-accent underline underline-offset-2">contact@chezlaziz.com</a> · <a href="tel:+21623691039" className="text-accent underline underline-offset-2">+216 23 691 039</a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Quelles données nous collectons</h2>
            <p>Lorsque vous utilisez le formulaire de commande ou de contact, nous recevons :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Votre nom et numéro de téléphone</li>
              <li>Votre adresse de livraison (gouvernorat, ville, adresse, code postal)</li>
              <li>Le détail de votre commande ou de votre message</li>
              <li>
                Si vous payez par D17 : la capture d'écran du paiement, utilisée
                uniquement pour vérifier la transaction
              </li>
            </ul>
            <p className="mt-2">
              Nous ne demandons ni mot de passe, ni adresse email, ni numéro de carte
              bancaire — aucun paiement en ligne n'est traité sur ce site (paiement en
              espèces ou par virement D17 uniquement).
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Comment nous utilisons ces données</h2>
            <p>
              Ces informations servent uniquement à préparer, livrer et confirmer
              votre commande, à vérifier un paiement D17, ou à répondre à votre
              message (par téléphone ou Messenger). Elles sont conservées dans notre
              base de données pour le suivi des commandes et ne sont ni vendues, ni
              partagées avec des tiers à des fins commerciales. La capture d'écran
              D17 n'est accessible qu'à notre équipe, jamais publiée ni partagée.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Cookies et mesure d'audience</h2>
            <p>
              Nous mesurons le nombre de pages vues avec un compteur anonyme sur notre
              propre serveur, actif en permanence et sans cookie.
            </p>
            {(analyticsEnabled || metaPixelEnabled) && (
              <>
                <p className="mt-2">
                  En plus de ce compteur, et uniquement si vous cliquez sur « Accepter »
                  dans le bandeau de cookies :
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {analyticsEnabled && (
                    <li>
                      Google Analytics (adresse IP anonymisée) nous indique d'où
                      viennent les visiteurs et quelles pages ils consultent.
                    </li>
                  )}
                  {metaPixelEnabled && (
                    <li>
                      Le Pixel Meta (Facebook/Instagram) nous permet de mesurer
                      l'efficacité de nos publicités et de ne plus vous montrer une
                      publicité déjà vue. Lorsqu'une commande est confirmée, votre
                      numéro de téléphone est haché (rendu illisible, irréversible)
                      avant d'être transmis à Meta pour associer l'achat à la
                      campagne publicitaire — jamais en clair, jamais votre nom ni
                      votre adresse.
                    </li>
                  )}
                </ul>
                <p className="mt-2">
                  Dans les deux cas, seuls les produits consultés ou commandés et les
                  montants sont transmis — jamais le contenu des formulaires (nom,
                  adresse, capture d'écran). Si vous cliquez sur « Refuser », aucun de
                  ces deux outils ne se charge ; seul le compteur interne reste actif.
                </p>
              </>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Vos droits</h2>
            <p>
              Vous pouvez à tout moment nous demander de consulter, corriger ou
              supprimer les informations que vous nous avez transmises, en nous
              contactant directement par téléphone ou par email.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Contact</h2>
            <p>
              Pour toute question concernant vos données personnelles, contactez-nous
              au <a href="tel:+21623691039" className="text-accent underline underline-offset-2">+216 23 691 039</a> ou par email à <a href="mailto:contact@chezlaziz.com" className="text-accent underline underline-offset-2">contact@chezlaziz.com</a>.
            </p>
          </section>
        </div>

        <Link to="/" className="arrow-link mt-14 inline-flex">
          Retour à l'accueil
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
            <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>
      </main>
      <Footer />
    </div>
  )
}
