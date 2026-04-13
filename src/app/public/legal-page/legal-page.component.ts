import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type LegalPageKey = 'privacy' | 'terms' | 'refund';

type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
};

@Component({
  selector: 'app-legal-page',
  templateUrl: './legal-page.component.html',
  styleUrls: ['./legal-page.component.css'],
})
export class LegalPageComponent implements OnInit {
  currentLang: 'ar' | 'en' = 'ar';
  content!: LegalContent;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.currentLang = this.detectLangFromPath();
    const pageKey = (this.route.snapshot.data['legalPage'] || 'privacy') as LegalPageKey;
    this.content = this.buildContent(pageKey);
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }

  private buildContent(pageKey: LegalPageKey): LegalContent {
    const locale = this.currentLang;

    const content: Record<'ar' | 'en', Record<LegalPageKey, LegalContent>> = {
      ar: {
        privacy: {
          eyebrow: 'معلومات قانونية',
          title: 'سياسة الخصوصية',
          intro:
            'توضح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها عند استخدام منصة نبضة حياة أو شراء الكورسات أو حجز الجلسات.',
          updatedAt: 'آخر تحديث: 13 أبريل 2026',
          sections: [
            {
              heading: 'البيانات التي نجمعها',
              paragraphs: [
                'قد نجمع بيانات مثل الاسم والبريد الإلكتروني ورقم الهاتف وبيانات الدفع وبيانات الاستخدام اللازمة لتقديم الخدمة وتشغيل الحسابات وحماية المنصة.',
                'عند حجز الجلسات أو شراء الكورسات، قد نحتفظ بسجل الطلبات والمدفوعات وبيانات الوصول المرتبطة بالحساب.',
              ],
            },
            {
              heading: 'كيفية استخدام البيانات',
              paragraphs: [
                'نستخدم البيانات لإتمام عمليات الشراء، تفعيل الوصول للكورسات، التواصل بخصوص الطلبات، تحسين تجربة الاستخدام، والالتزام بالمتطلبات القانونية والتنظيمية.',
                'لا يتم استخدام بياناتك لأغراض غير مرتبطة بالخدمة دون أساس واضح أو موافقة مناسبة عند الحاجة.',
              ],
            },
            {
              heading: 'مشاركة البيانات وحمايتها',
              paragraphs: [
                'قد تتم مشاركة الحد الأدنى من البيانات مع مزودي الخدمات التقنيين أو مزودي الدفع أو أدوات الاستضافة بما يلزم فقط لتشغيل الخدمة بأمان.',
                'نعتمد إجراءات حماية تقنية وإدارية معقولة، لكن لا يمكن ضمان الأمان الكامل لأي نظام متصل بالإنترنت بشكل مطلق.',
              ],
            },
            {
              heading: 'حقوقك',
              paragraphs: [
                'يمكنك طلب تحديث بياناتك أو تصحيحها أو طلب حذفها في الحدود التي يسمح بها القانون والاحتفاظ التشغيلي والمالي المطلوب.',
                'لأي استفسار بخصوص الخصوصية أو البيانات، يمكنك التواصل عبر صفحة التواصل داخل الموقع.',
              ],
            },
          ],
        },
        terms: {
          eyebrow: 'معلومات قانونية',
          title: 'الشروط والأحكام',
          intro:
            'باستخدامك لمنصة نبضة حياة أو تسجيلك أو إتمامك لأي عملية شراء، فأنت توافق على هذه الشروط والأحكام المنظمة لاستخدام الخدمة.',
          updatedAt: 'آخر تحديث: 13 أبريل 2026',
          sections: [
            {
              heading: 'استخدام المنصة',
              paragraphs: [
                'يجب استخدام المنصة بشكل قانوني وشخصي، ويُمنع إساءة استخدام المحتوى أو محاولة الوصول غير المصرح به أو تعطيل الخدمات أو نسخ المواد المحمية دون تصريح.',
                'أنت مسؤول عن صحة البيانات التي تقدمها وعن الحفاظ على سرية بيانات الدخول الخاصة بحسابك.',
              ],
            },
            {
              heading: 'الشراء والوصول للمحتوى',
              paragraphs: [
                'يتم تفعيل الوصول للمحتوى أو الخدمات بعد نجاح الدفع والتحقق منه وفق آليات المنصة ومزود الدفع.',
                'الوصول الممنوح للمحتوى شخصي وغير قابل لإعادة البيع أو المشاركة أو التوزيع خارج ما تسمح به المنصة صراحة.',
              ],
            },
            {
              heading: 'إخلاء المسؤولية',
              paragraphs: [
                'المحتوى التعليمي والإرشادي داخل المنصة لا يُعد بديلًا عن التشخيص الطبي أو التدخل العلاجي الطارئ أو الرعاية الطبية المباشرة عند الحاجة.',
                'تحتفظ المنصة بحق تعديل أو تحديث أو إيقاف أي جزء من الخدمات أو المحتوى عند الحاجة التشغيلية أو القانونية.',
              ],
            },
            {
              heading: 'الحقوق الفكرية',
              paragraphs: [
                'جميع المواد والمحتويات والنصوص والتصميمات والعناصر التعليمية داخل المنصة مملوكة للمنصة أو مرخصة لها، ولا يجوز استخدامها خارج الحدود المسموح بها.',
              ],
            },
          ],
        },
        refund: {
          eyebrow: 'معلومات قانونية',
          title: 'سياسة الاسترجاع والإلغاء',
          intro:
            'توضح هذه السياسة الحالات التي يمكن فيها إلغاء الطلب أو استرداد المبلغ، وكيفية التعامل مع الجلسات والكورسات والخدمات الرقمية.',
          updatedAt: 'آخر تحديث: 13 أبريل 2026',
          sections: [
            {
              heading: 'الخدمات الرقمية والكورسات',
              paragraphs: [
                'بسبب طبيعة المحتوى الرقمي، قد لا يكون الاسترجاع متاحًا بعد تفعيل الوصول أو بدء استخدام المحتوى، إلا في حالات الخطأ التقني الجوهري أو التحصيل غير الصحيح.',
                'إذا تم الدفع بنجاح ولم يتم تفعيل الوصول بسبب خلل من جهة المنصة، يتم تصحيح المشكلة أو النظر في الاسترجاع وفق الحالة.',
              ],
            },
            {
              heading: 'الجلسات والاستشارات',
              paragraphs: [
                'يمكن طلب إعادة الجدولة أو الإلغاء قبل موعد الجلسة بفترة مناسبة وفق سياسة الحجز المعتمدة لدى المنصة وقت الحجز.',
                'قد لا يكون الاسترجاع ممكنًا في حالة التغيب عن الموعد أو طلب الإلغاء المتأخر أو بعد تقديم الخدمة بالفعل.',
              ],
            },
            {
              heading: 'طريقة طلب المراجعة',
              paragraphs: [
                'لأي طلب استرجاع أو إلغاء، يجب التواصل ببيانات الطلب عبر صفحة التواصل أو قناة الدعم الرسمية مع توضيح سبب الطلب ورقم العملية أو الحجز.',
                'تتم مراجعة الطلبات بشكل فردي، وإذا تمت الموافقة على الاسترجاع فسيتم عبر وسيلة الدفع الأصلية ما أمكن.',
              ],
            },
          ],
        },
      },
      en: {
        privacy: {
          eyebrow: 'Legal information',
          title: 'Privacy Policy',
          intro:
            'This policy explains how Nabdah Hayah collects, uses, and protects your data when you use the platform, purchase courses, or book sessions.',
          updatedAt: 'Last updated: April 13, 2026',
          sections: [
            {
              heading: 'Data we collect',
              paragraphs: [
                'We may collect information such as your name, email address, phone number, payment details, and service usage data required to operate the platform and your account.',
                'When you book sessions or purchase courses, we may retain order records, payment references, and access-related account information.',
              ],
            },
            {
              heading: 'How we use data',
              paragraphs: [
                'We use data to process purchases, grant access to content, communicate about requests, improve the service, and comply with legal and operational obligations.',
                'Your data is not used for unrelated purposes without an appropriate basis or consent when required.',
              ],
            },
            {
              heading: 'Sharing and protection',
              paragraphs: [
                'We may share the minimum necessary data with technical service providers, payment processors, and hosting providers only as needed to operate the service securely.',
                'We apply reasonable technical and administrative safeguards, but no internet-based system can be guaranteed to be completely secure.',
              ],
            },
            {
              heading: 'Your rights',
              paragraphs: [
                'You may request to update, correct, or delete your information within the limits permitted by law and necessary operational or financial retention requirements.',
                'For privacy-related questions, please contact us through the website contact page.',
              ],
            },
          ],
        },
        terms: {
          eyebrow: 'Legal information',
          title: 'Terms and Conditions',
          intro:
            'By using Nabdah Hayah, registering an account, or completing a purchase, you agree to these terms and conditions governing the use of the platform.',
          updatedAt: 'Last updated: April 13, 2026',
          sections: [
            {
              heading: 'Use of the platform',
              paragraphs: [
                'The platform must be used lawfully and personally. Misuse, unauthorized access attempts, disruption of services, or copying protected content without permission is prohibited.',
                'You are responsible for the accuracy of the information you provide and for maintaining the confidentiality of your account credentials.',
              ],
            },
            {
              heading: 'Purchases and access',
              paragraphs: [
                'Access to content or services is granted after successful payment and verification according to the platform workflow and payment provider checks.',
                'Any granted access is personal and may not be resold, shared, or redistributed outside the permissions explicitly provided by the platform.',
              ],
            },
            {
              heading: 'Disclaimer',
              paragraphs: [
                'Educational and guidance materials on the platform are not a substitute for medical diagnosis, urgent intervention, or direct healthcare when needed.',
                'The platform reserves the right to update, modify, or discontinue parts of the service or content when operationally or legally necessary.',
              ],
            },
            {
              heading: 'Intellectual property',
              paragraphs: [
                'All materials, texts, designs, and educational assets on the platform are owned by or licensed to the platform and may not be used beyond the permitted scope.',
              ],
            },
          ],
        },
        refund: {
          eyebrow: 'Legal information',
          title: 'Refund and Cancellation Policy',
          intro:
            'This policy explains when an order may be cancelled or refunded and how courses, sessions, and digital services are handled.',
          updatedAt: 'Last updated: April 13, 2026',
          sections: [
            {
              heading: 'Digital services and courses',
              paragraphs: [
                'Because digital content is delivered electronically, refunds may not be available after access has been activated or the content has started to be used, except in cases of material technical failure or incorrect charging.',
                'If payment is completed successfully but access is not granted due to a platform-side issue, the issue will be corrected or the refund request will be reviewed accordingly.',
              ],
            },
            {
              heading: 'Sessions and consultations',
              paragraphs: [
                'Rescheduling or cancellation may be requested before the session time within the booking policy applicable at the time of the reservation.',
                'Refunds may not be available in cases of no-show, late cancellation, or after the service has already been delivered.',
              ],
            },
            {
              heading: 'How to request a review',
              paragraphs: [
                'For refund or cancellation requests, please contact support with your order details, booking reference, and the reason for the request through the official contact channel.',
                'Requests are reviewed individually, and when approved, refunds are processed through the original payment method whenever possible.',
              ],
            },
          ],
        },
      },
    };

    return content[locale][pageKey];
  }
}
