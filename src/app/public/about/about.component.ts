import { Component, OnInit } from '@angular/core';

interface AboutStat {
  number: string;
  label: string;
}

interface AboutTimelineItem {
  title: string;
  text: string;
}

interface AboutAudienceCard {
  title: string;
  text?: string;
  points?: string[];
}

interface AboutContent {
  dir: 'rtl' | 'ltr';
  imageAlt: string;
  eyebrow: string;
  name: string;
  titleMain: string;
  titleSub: string;
  rolesLabel: string;
  roles: string[];
  tags: string[];
  stats: AboutStat[];
  ctaPrimary: string;
  smallNote: string;
  pageTitle: string;
  pageSubtitle: string;
  introLabel: string;
  introTitle: string;
  introParagraphs: string[];
  quote: string;
  qualificationsLabel: string;
  timeline: AboutTimelineItem[];
  trainingItems: string[];
  specialtiesLabel: string;
  specialties: string[];
  audienceLabel: string;
  audienceCards: AboutAudienceCard[];
  reminderLabel: string;
  reminders: string[];
  endCtaTitle: string;
  endCtaText: string;
  endCtaButton: string;
  signatureGreeting: string;
  signatureName: string;
  signatureTitles: string[];
}

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {
  currentLang: 'ar' | 'en' = 'ar';

  private readonly contentMap: Record<'ar' | 'en', AboutContent> = {
    ar: {
      dir: 'rtl',
      imageAlt: 'المدربة إنعام عبد اللاه',
      eyebrow: 'من نحن',
      name: 'المدربة إنعام عبد اللاه',
      titleMain: 'مستشار الصحة النفسية والتنمية الذاتية',
      titleSub: 'مستشار تدريب وتنمية بشرية وأسري وتربوي',
      rolesLabel: 'مجالات عمل المدربة',
      roles: [
        'مستشار الصحة النفسية والتنمية الذاتية',
        'مستشار تدريب وتنمية بشرية',
        'مستشار أسري وتربوي',
        'مدرب الوعي الذاتي وفهم المشاعر'
      ],
      tags: ['دكتوراه مهنية', 'صحة نفسية', 'تنمية بشرية', 'إرشاد أسري'],
      stats: [
        { number: '+10', label: 'سنوات خبرة' },
        { number: '+25', label: 'برنامج ودورة' },
        { number: '+1000', label: 'مستفيد/ة' }
      ],
      ctaPrimary: 'احجز استشارة فردية',
      smallNote: 'الجلسات تتم أونلاين مع خصوصية وسرية تامة',
      pageTitle: 'من المدربة إنعام عبد اللاه',
      pageSubtitle:
        'رحلة علمية وعملية تهدف لفهم جذور الألم النفسي وبناء وعي صحي ينعكس على علاقاتك وحياتك.',
      introLabel: 'نبذة تعريفية',
      introTitle: 'رؤية عميقة للإنسان تتجاوز حدود العرض النفسي',
      introParagraphs: [
        'تجمع المدربة إنعام عبد اللاه بين التكوين الأكاديمي المتخصص والخبرة العملية مع الأفراد والأسر في مجالات الصحة النفسية والتنمية الذاتية.',
        'تهتم بالوصول إلى جذور الألم النفسي بدل الاكتفاء بملاحقة الأعراض الظاهرة؛ لتساعد الإنسان على بناء وعي حقيقي بذاته وترميم علاقته بنفسه وبمن حوله على أسس صحية وناضجة.'
      ],
      quote:
        'أؤمن أن كل إنسان يحمل داخله بذرة صحة نفسية وفطرة سليمة، ودوري أن أرافقه في رحلة اكتشاف هذه البذرة ورعايتها حتى تتحول إلى نمط حياة أكثر وعيًا واتزانًا.',
      qualificationsLabel: 'المؤهلات الأكاديمية والمهنية',
      timeline: [
        {
          title: 'دكتوراه مهنية في ما وراء الإنسانية والتنمية الذاتية',
          text: 'تركّز على فهم الإنسان في أبعاده النفسية والفكرية والوجودية مع تطبيقات عملية في العلاج والتغيير.'
        },
        {
          title: 'ماجستير في الصحة النفسية',
          text: 'مع تعمّق في مدارس العلاج الحديثة وأساليب دعم الأفراد في التعامل مع القلق والاكتئاب واضطرابات العلاقات.'
        },
        {
          title: 'ماجستير تطويري وتحفيزي في تنمية الإنسان',
          text: 'يركّز على تمكين الإنسان من اكتشاف نقاط قوّته وإعادة صياغة صورته عن ذاته وبناء أهداف متّسقة مع قيمه.'
        },
        {
          title: 'دورات متقدمة في الإرشاد والعلاج النفسي',
          text: 'تدريب في أساليب الإرشاد والاستماع الفعّال وإدارة الجلسات الفردية والجماعية باحترافية.'
        }
      ],
      trainingItems: [
        'تدريب في اكتشاف الذات وفهم المشاعر',
        'تدريب في اكتشاف القدرات والمهارات الشخصية',
        'تدريب في معرفة وإدراك العالم المادي والعالم الشعوري',
        'تدريب في بناء العلاقات الاجتماعية والمهنية والأسرية'
      ],
      specialtiesLabel: 'مجالات التخصص',
      specialties: [
        'التعافي من صدمات الطفولة',
        'العلاقات الأسرية والزوجية',
        'إدارة القلق والاحتراق النفسي',
        'بناء صورة ذاتية صحية',
        'إرشاد الأمهات والتربية الواعية',
        'برامج المرأة والنجاح المتوازن',
        'تنمية الوعي بالذات والرسائل الداخلية',
        'إعداد وتقديم برامج تدريبية في التنمية البشرية',
        'إعداد وتقديم برامج تدريبية في القيادة والإدارة',
        'إعداد وتقديم برامج في الوعي الذاتي',
        'إعداد وتقديم برامج تدريبية في الوعي التربوي',
        'إعداد وتقديم برامج تدريبية في الإرشاد الأسري',
        'إعداد وتقديم برامج تدريبية في الإرشاد النفسي'
      ],
      audienceLabel: 'لمن هذه الجلسات والبرامج؟',
      audienceCards: [
        {
          title: 'لمن يحمل جرحًا لم يُعالج بعد',
          points: [
            'أشخاص يشعرون بألم داخلي متكرر.',
            'من مرّوا بصدمات طفولة أو صدمات عاطفية.',
            'من يعانون من اضطرابات نفسية أو الدخول في علاقات سامة.',
            'من تتكرر معهم أشخاص وأنماط وعلاقات مؤذية ولا يجدون تفسيرًا واضحًا لما يحدث معهم.'
          ]
        },
        {
          title: 'للأمهات والمربين',
          text:
            'من يرغبون في تربية واعية وإيقاف انتقال صدمات الطفولة بين الأجيال وبناء علاقة آمنة مع الأبناء.'
        },
        {
          title: 'للنساء الباحثات عن الاتزان',
          text:
            'نساء يبحثن عن تحقيق النجاح دون أن يفقدن ذواتهن بين الأدوار الأسرية والاجتماعية والمهنية.'
        },
        {
          title: 'لمن يريد بداية مختلفة',
          points: [
            'كل شخص قرّر أن يتوقف عن التكرار.',
            'من يبدأ رحلة جديدة مع ذاته مبنية على الوعي والمسؤولية والرحمة.',
            'من يبحث عن تحقيق أهدافه الشخصية والمهنية.',
            'من لا يعرف كيف يبدأ ومتى يبدأ وأين يبدأ.',
            'من يشعر بالضياع وعدم وضوح الرؤية.',
            'من يضيع وقته على الميديا بدون إنجاز أو نتيجة.',
            'من يسعى لمعرفة الرسالة الكونية التي خُلق لها.'
          ]
        }
      ],
      reminderLabel: 'تذكّر',
      reminders: [
        'المعرفة كنز وتطبيق المعرفة مفتاح الكنز',
        'الاستثمار في الذات هو أفضل استثمار',
        'اصرف على دماغك عشان دماغك تصرف عليك',
        'عندما يجهز الطالب يظهر المعلم'
      ],
      endCtaTitle: 'جاهز/ة تبدأ رحلة أهدأ؟',
      endCtaText:
        'احجز جلستك الآن وخد أول خطوة واضحة نحو فهم أعمق لذاتك وبناء خطة تناسبك.',
      endCtaButton: 'احجز موعدًا الآن',
      signatureGreeting: 'تحياتي وامتناني ليكم جميعًا',
      signatureName: 'مدربة / إنعام عبد اللاه',
      signatureTitles: [
        'مستشار الصحة النفسية والتنمية الذاتية',
        'مستشار التدريب والتنمية البشرية'
      ]
    },
    en: {
      dir: 'ltr',
      imageAlt: 'Coach Enam Abdellah',
      eyebrow: 'About us',
      name: 'Coach Enam Abdellah',
      titleMain: 'Mental Health and Self-Development Consultant',
      titleSub: 'Training, Human Development, Family and Parenting Consultant',
      rolesLabel: 'Coach areas of work',
      roles: [
        'Mental Health and Self-Development Consultant',
        'Training and Human Development Consultant',
        'Family and Parenting Consultant',
        'Self-Awareness and Emotional Understanding Coach'
      ],
      tags: ['Professional Doctorate', 'Mental Health', 'Human Development', 'Family Counseling'],
      stats: [
        { number: '+10', label: 'Years of experience' },
        { number: '+25', label: 'Programs and courses' },
        { number: '+1000', label: 'Beneficiaries' }
      ],
      ctaPrimary: 'Book a private consultation',
      smallNote: 'Sessions are held online with complete privacy and confidentiality',
      pageTitle: 'About Coach Enam Abdellah',
      pageSubtitle:
        'A scientific and practical journey that aims to understand the roots of psychological pain and build healthy awareness that reflects on your relationships and life.',
      introLabel: 'Introduction',
      introTitle: 'A deep view of the human being that goes beyond psychological symptoms',
      introParagraphs: [
        'Coach Enam Abdellah combines specialized academic training with practical experience working with individuals and families in mental health and self-development.',
        'She focuses on reaching the roots of psychological pain rather than merely following visible symptoms, helping people build genuine self-awareness and restore healthier, more mature relationships with themselves and others.'
      ],
      quote:
        'I believe every person carries within them the seed of mental well-being and a sound nature. My role is to accompany them in discovering and nurturing that seed until it becomes a more aware and balanced way of life.',
      qualificationsLabel: 'Academic and professional qualifications',
      timeline: [
        {
          title: 'Professional Doctorate in Transhumanity and Self-Development',
          text: 'Focused on understanding the human being in psychological, intellectual, and existential dimensions, with practical applications in healing and change.'
        },
        {
          title: 'Master’s Degree in Mental Health',
          text: 'With in-depth study of modern therapeutic approaches and methods of supporting individuals in dealing with anxiety, depression, and relationship disorders.'
        },
        {
          title: 'Developmental and Motivational Master’s in Human Development',
          text: 'Focused on empowering individuals to discover their strengths, reshape their self-image, and build goals aligned with their values.'
        },
        {
          title: 'Advanced Courses in Counseling and Psychotherapy',
          text: 'Training in counseling methods, active listening, and professional management of individual and group sessions.'
        }
      ],
      trainingItems: [
        'Training in self-discovery and understanding emotions',
        'Training in discovering personal abilities and skills',
        'Training in understanding the material world and the emotional world',
        'Training in building social, professional, and family relationships'
      ],
      specialtiesLabel: 'Areas of specialization',
      specialties: [
        'Healing from childhood trauma',
        'Family and marital relationships',
        'Managing anxiety and burnout',
        'Building a healthy self-image',
        'Guidance for mothers and conscious parenting',
        'Women’s programs and balanced success',
        'Developing self-awareness and inner messages',
        'Preparing and delivering training programs in human development',
        'Preparing and delivering training programs in leadership and management',
        'Preparing and delivering programs in self-awareness',
        'Preparing and delivering training programs in parenting awareness',
        'Preparing and delivering training programs in family counseling',
        'Preparing and delivering training programs in psychological counseling'
      ],
      audienceLabel: 'Who are these sessions and programs for?',
      audienceCards: [
        {
          title: 'For anyone carrying an unhealed wound',
          points: [
            'People who feel recurring inner pain.',
            'People who have experienced childhood trauma or emotional trauma.',
            'People dealing with psychological struggles or toxic relationships.',
            'People who keep repeating harmful people, patterns, and relationships without a clear explanation.'
          ]
        },
        {
          title: 'For mothers and caregivers',
          text:
            'For those who seek conscious parenting, want to stop the transmission of childhood trauma across generations, and build a secure relationship with their children.'
        },
        {
          title: 'For women seeking balance',
          text:
            'Women striving for success without losing themselves amid family, social, and professional roles.'
        },
        {
          title: 'For anyone who wants a different beginning',
          points: [
            'Anyone who has decided to stop repeating old patterns.',
            'Anyone starting a new journey with themselves based on awareness, responsibility, and compassion.',
            'Anyone seeking to achieve personal and professional goals.',
            'Anyone who does not know how to start, when to start, or where to start.',
            'Anyone who feels lost or lacks clarity of vision.',
            'Anyone who wastes time on social media without achievement or results.',
            'Anyone seeking to understand the life message they were created for.'
          ]
        }
      ],
      reminderLabel: 'Remember',
      reminders: [
        'Knowledge is a treasure, and applying knowledge is the key to the treasure.',
        'Investing in yourself is the best investment.',
        'Invest in your mind so your mind can invest in you.',
        'When the student is ready, the teacher appears.'
      ],
      endCtaTitle: 'Ready to begin a calmer journey?',
      endCtaText:
        'Book your session now and take the first clear step toward deeper self-understanding and a plan that suits you.',
      endCtaButton: 'Book an appointment now',
      signatureGreeting: 'With appreciation and gratitude to you all',
      signatureName: 'Coach / Enam Abdellah',
      signatureTitles: [
        'Mental Health and Self-Development Consultant',
        'Training and Human Development Consultant'
      ]
    }
  };

  ngOnInit(): void {
    this.currentLang = this.detectLangFromPath();
  }

  get content(): AboutContent {
    return this.contentMap[this.currentLang];
  }

  trackByIndex(index: number): number {
    return index;
  }

  private detectLangFromPath(): 'ar' | 'en' {
    const seg = window.location.pathname.split('/')[1];
    return seg === 'en' ? 'en' : 'ar';
  }
}
