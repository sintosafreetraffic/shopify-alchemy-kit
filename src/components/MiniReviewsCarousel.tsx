import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { PillowFocus } from "@/config/pillowFocusContent";

// Reviewer avatars for 55+ demographic - 5 unique avatars
import margaretAvatar from "@/assets/avatars/margaret-williams-avatar.webp";
import robertAvatar from "@/assets/avatars/robert-johnson-avatar.webp";
import patriciaAvatar from "@/assets/avatars/patricia-anderson-avatar.webp";
import davidAvatar from "@/assets/avatars/david-patterson-avatar.webp";
import susanAvatar from "@/assets/avatars/susan-miller-avatar.webp";

// Neck pain focused reviews
const neckPainReviews = [
  {
    id: "mini-neck-1",
    customer_name: "Margaret Williams",
    avatar: margaretAvatar,
    rating: 5,
    body: "I'm 61 in Minnesota and I was waking with neck and shoulder pain most mornings. After a week on this pillow it's basically gone. I didn't think a pillow could do that but it did.",
    city: "Minneapolis, MN",
  },
  {
    id: "mini-neck-2",
    customer_name: "Robert Johnson",
    avatar: robertAvatar,
    rating: 5,
    body: "My neck pain was every day from side sleeping and my shoulders were tight too. This keeps my head level and the neck pain stopped. I still get normal aches sometimes but not that sharp morning neck thing.",
    city: "Los Angeles, CA",
  },
  {
    id: "mini-neck-3",
    customer_name: "Patricia Anderson",
    avatar: patriciaAvatar,
    rating: 5,
    body: "I had that constant stiff neck feeling like I slept wrong. Since switching to this I wake up and my neck feels normal again. No more neck and shoulder pain first thing in the morning.",
    city: "St. Paul, MN",
  },
  {
    id: "mini-neck-4",
    customer_name: "David Patterson",
    avatar: davidAvatar,
    rating: 5,
    body: "I tried different pillows and nothing fixed it because they go flat. This one holds the height and my neck pain is gone like 90%. I can turn my head in the morning without wincing.",
    city: "New York, NY",
  },
  {
    id: "mini-neck-5",
    customer_name: "Susan Miller",
    avatar: susanAvatar,
    rating: 5,
    body: "I was skeptical but I don't wake up with the neck pain anymore. My shoulders aren't up by my ears all night either. It just keeps me lined up better on my side.",
    city: "Duluth, MN",
  },
];

// Back pain focused reviews
const backPainReviews = [
  {
    id: "mini-back-1",
    customer_name: "Margaret Williams",
    avatar: margaretAvatar,
    rating: 5,
    body: "I'm 64 in Minnesota and I used to wake up with a completely numb arm and tingling fingers. After a week on this pillow it's basically gone. I didn't think a pillow could fix that but it did.",
    city: "Minneapolis, MN",
  },
  {
    id: "mini-back-2",
    customer_name: "Robert Johnson",
    avatar: robertAvatar,
    rating: 5,
    body: "Side sleeping gave me a dead arm every single morning. My shoulder was compressed all night and I'd wake up shaking my hand trying to get feeling back. This pillow fixed that completely.",
    city: "Los Angeles, CA",
  },
  {
    id: "mini-back-3",
    customer_name: "Patricia Anderson",
    avatar: patriciaAvatar,
    rating: 5,
    body: "I had arm numbness for years and kept blaming my mattress. Turns out my pillow was compressing my shoulder all night. This one takes the pressure off and the numbness is gone.",
    city: "St. Paul, MN",
  },
  {
    id: "mini-back-4",
    customer_name: "David Patterson",
    avatar: davidAvatar,
    rating: 5,
    body: "I was stacking pillows trying to stop waking up with a dead arm. This one fixed it way faster than I expected. No more pins and needles in the morning.",
    city: "New York, NY",
  },
  {
    id: "mini-back-5",
    customer_name: "Susan Miller",
    avatar: susanAvatar,
    rating: 5,
    body: "Took a couple nights to get used to but I don't wake up with a numb arm anymore. I sleep on my side and this keeps my shoulder from getting crushed all night.",
    city: "Duluth, MN",
  },
];

// Country-specific reviewer overrides for first 3 slots (name, city, and localized body text)
const COUNTRY_REVIEWERS: Record<string, Array<{ name: string; city: string; neckBody: string; backBody: string }>> = {
  NL: [
    { name: "Marijke de Vries", city: "Amsterdam", neckBody: "Ik ben 61 en werd elke ochtend wakker met nek- en schouderpijn. Na een week op dit kussen is het bijna helemaal weg. Ik had niet gedacht dat een kussen zoveel verschil kon maken.", backBody: "Ik ben 64 en werd bijna elke ochtend wakker met een gevoelloze arm en tintelende vingers. Na een week op dit kussen is het bijna helemaal weg. Ik had niet gedacht dat een kussen dat kon oplossen." },
    { name: "Henk Bakker", city: "Rotterdam", neckBody: "Mijn nekpijn was dagelijks door het slapen op mijn zij, en mijn schouders waren ook stijf. Dit kussen houdt mijn hoofd recht en de nekpijn is gestopt. Een enorm verschil.", backBody: "Op mijn zij slapen gaf me elke ochtend een dode arm. Mijn schouder werd de hele nacht samengedrukt. Dit kussen haalt de druk eraf en de gevoelloosheid is verdwenen." },
    { name: "Anneke van Dijk", city: "Utrecht", neckBody: "Ik had constant een stijf gevoel in mijn nek, alsof ik verkeerd had geslapen. Sinds ik dit kussen gebruik, voel ik me 's ochtends weer normaal. Geen nek- en schouderpijn meer.", backBody: "Ik had jarenlang last van een gevoelloze arm en gaf steeds de matras de schuld. Dit kussen houdt mijn schouder vrij en de gevoelloosheid is gestopt." },
  ],
  GB: [
    { name: "Margaret Thompson", city: "London", neckBody: "I'm 62 and was waking with neck and shoulder pain most mornings. After a week on this pillow it's basically gone. I didn't think a pillow could do that, but it did.", backBody: "I'm 63 and used to wake up with a completely numb arm almost every morning. After a week on this pillow it's basically gone. Didn't think a pillow could fix that." },
    { name: "Robert Clarke", city: "Manchester", neckBody: "My neck pain was every day from side sleeping, and my shoulders were tight too. This keeps my head level and the neck pain stopped. I still get normal aches, but not that sharp morning neck thing.", backBody: "Side sleeping always gave me a dead arm when I woke up. Since switching to this, the numbness is gone. My shoulder isn't compressed all night anymore." },
    { name: "Patricia Hughes", city: "Edinburgh", neckBody: "I had that constant stiff neck feeling, like I'd slept wrong. Since switching to this, I wake up and my neck feels normal again. No more neck and shoulder pain first thing.", backBody: "I had arm numbness for years and kept blaming the mattress. Turns out my pillow was crushing my shoulder all night. This one takes the pressure off completely." },
  ],
  AU: [
    { name: "Margaret Thompson", city: "Sydney", neckBody: "I'm 61 and was waking with neck and shoulder pain most mornings. After a week on this pillow it's basically gone. Didn't think a pillow could make that much difference.", backBody: "I'm 64 and used to wake up with a completely numb arm almost every morning. After a week on this pillow it's basically gone. Really surprised a pillow could fix that." },
    { name: "Robert Clarke", city: "Melbourne", neckBody: "My neck pain was every day from side sleeping. This keeps my head level and the neck pain stopped. I still get normal aches sometimes, but not that sharp morning neck thing.", backBody: "Side sleeping always gave me a dead arm when I woke up. Since switching to this, no more pins and needles. Big difference." },
    { name: "Patricia Hughes", city: "Brisbane", neckBody: "Had that constant stiff neck feeling, like I'd slept wrong. Since switching to this, I wake up and my neck feels normal again. No more neck and shoulder pain first thing.", backBody: "Had arm numbness for years and kept blaming the mattress. This keeps my shoulder from getting compressed and the numbness is gone." },
  ],
  NZ: [
    { name: "Margaret Thompson", city: "Auckland", neckBody: "I'm 62 and was waking with neck and shoulder pain most mornings. After a week on this pillow it's basically gone. Didn't think a pillow could do that.", backBody: "I'm 63 and used to wake up with a numb arm and tingling fingers almost every morning. After a week on this pillow it's basically gone. Really didn't expect that." },
    { name: "Robert Clarke", city: "Wellington", neckBody: "My neck pain was every day from side sleeping. This keeps my head level and the neck pain stopped. I still get normal aches, but that sharp morning neck thing is gone.", backBody: "Side sleeping always gave me a dead arm. Since switching to this, the numbness and tingling are gone. Not perfect every day, but a huge improvement." },
    { name: "Patricia Hughes", city: "Christchurch", neckBody: "Had that constant stiff neck feeling. Since switching to this, I wake up and my neck feels normal again. No more neck and shoulder pain first thing in the morning.", backBody: "Had arm numbness for years. Turns out my pillow was compressing my shoulder all night. This one takes the pressure off and the numbness stopped." },
  ],
  SE: [
    { name: "Margareta Lindqvist", city: "Stockholm", neckBody: "Jag är 61 och vaknade med nack- och axelvärk nästan varje morgon. Efter en vecka med den här kudden är det i princip borta. Jag trodde inte att en kudde kunde göra en sådan skillnad.", backBody: "Jag är 64 och brukade vakna med en helt domnad arm och stickningar i fingrarna. Efter en vecka med den här kudden är det i princip borta. Jag trodde inte att en kudde kunde lösa det." },
    { name: "Robert Eriksson", city: "Göteborg", neckBody: "Min nackvärk var daglig på grund av att jag sov på sidan, och axlarna var spända. Den här kudden håller huvudet i rätt nivå och nackvärken har försvunnit. Stor skillnad.", backBody: "Att sova på sidan gav mig en död arm varje morgon. Axeln pressades ihop hela natten. Den här kudden tar bort trycket och domningen är borta." },
    { name: "Patricia Nilsson", city: "Malmö", neckBody: "Jag hade den där konstanta stela känslan i nacken, som om jag hade sovit fel. Sedan jag bytte till den här kudden känns nacken normal igen på morgonen.", backBody: "Jag hade domningar i armen i flera år och skyllde på madrassen. Den här kudden håller axeln fri och domningen har försvunnit." },
  ],
  NO: [
    { name: "Margareta Haugen", city: "Oslo", neckBody: "Jeg er 61 og våknet med nakke- og skuldersmerter nesten hver morgen. Etter en uke med denne puten er det stort sett borte. Jeg trodde ikke en pute kunne gjøre en slik forskjell.", backBody: "Jeg er 64 og pleide å våkne med en helt nummen arm og prikking i fingrene. Etter en uke med denne puten er det stort sett borte. En utrolig forskjell." },
    { name: "Robert Bakke", city: "Bergen", neckBody: "Nakkesmertene mine var daglige på grunn av sidesovingen, og skuldrene var stramme. Denne puten holder hodet i riktig nivå, og nakkesmertene har forsvunnet. Kjempeforskjell.", backBody: "Å sove på siden ga meg en død arm hver morgen. Skulderen ble klemt hele natten. Denne puten tar bort trykket, og nummenhet er borte." },
    { name: "Patricia Larsen", city: "Trondheim", neckBody: "Jeg hadde den konstante stive følelsen i nakken, som om jeg hadde sovet feil. Siden jeg byttet til denne puten, føles nakken normal igjen om morgenen.", backBody: "Jeg hadde nummenhet i armen i flere år og la skylden på madrassen. Denne puten holder skulderen fri, og nummenheten har forsvunnet." },
  ],
  DK: [
    { name: "Margarete Jensen", city: "København", neckBody: "Jeg er 61 og vågede op med nakke- og skuldersmerter næsten hver morgen. Efter en uge med denne pude er det stort set væk. Jeg troede ikke, at en pude kunne gøre så stor forskel.", backBody: "Jeg er 64 og plejede at vågne op med en helt følelsesløs arm og prikkende fingre. Efter en uge med denne pude er det stort set væk. Jeg troede ikke, at en pude kunne løse det." },
    { name: "Robert Nielsen", city: "Aarhus", neckBody: "Mine nakkesmerter var daglige på grund af sidesovning, og mine skuldre var spændte. Denne pude holder hovedet i det rigtige niveau, og nakkesmerterne er forsvundet. Kæmpe forskel.", backBody: "At sove på siden gav mig en død arm hver morgen. Skulderen blev klemt hele natten. Denne pude fjerner trykket, og følelsesløsheden er væk." },
    { name: "Patricia Madsen", city: "Odense", neckBody: "Jeg havde den konstante stive følelse i nakken, som om jeg havde sovet forkert. Siden jeg skiftede til denne pude, føles nakken normal igen om morgenen.", backBody: "Jeg havde følelsesløshed i armen i flere år og gav madrassen skylden. Denne pude holder skulderen fri, og følelsesløsheden er forsvundet." },
  ],
  DE: [
    { name: "Margarete Fischer", city: "Berlin", neckBody: "Ich bin 61 und bin fast jeden Morgen mit Nacken- und Schulterschmerzen aufgewacht. Nach einer Woche mit diesem Kissen sind sie praktisch verschwunden. Ich hätte nicht gedacht, dass ein Kissen so viel ausmachen kann.", backBody: "Ich bin 64 und bin fast jeden Morgen mit einem tauben Arm und kribbelnden Fingern aufgewacht. Nach einer Woche mit diesem Kissen ist das praktisch verschwunden. Erstaunlich, was ein Kissen bewirken kann." },
    { name: "Robert Müller", city: "München", neckBody: "Meine Nackenschmerzen waren täglich vom Seitenschlafen, und meine Schultern waren verspannt. Dieses Kissen hält den Kopf gerade, und die Nackenschmerzen haben aufgehört. Ein riesiger Unterschied.", backBody: "Seitenschlafen hat mir jeden Morgen einen tauben Arm beschert. Die Schulter wurde die ganze Nacht zusammengedrückt. Dieses Kissen nimmt den Druck weg und die Taubheit ist verschwunden." },
    { name: "Patricia Weber", city: "Hamburg", neckBody: "Ich hatte ständig dieses steife Gefühl im Nacken, als hätte ich falsch geschlafen. Seit ich dieses Kissen benutze, fühlt sich mein Nacken morgens wieder normal an.", backBody: "Ich hatte jahrelang Taubheitsgefühle im Arm und habe die Matratze dafür verantwortlich gemacht. Dieses Kissen hält die Schulter frei und die Taubheit hat aufgehört." },
  ],
  FR: [
    { name: "Marguerite Dupont", city: "Paris", neckBody: "J'ai 61 ans et je me réveillais avec des douleurs au cou et aux épaules presque chaque matin. Après une semaine avec cet oreiller, elles ont pratiquement disparu. Je ne pensais pas qu'un oreiller pouvait faire une telle différence.", backBody: "J'ai 64 ans et je me réveillais avec un bras complètement engourdi et des picotements dans les doigts presque chaque matin. Après une semaine avec cet oreiller, c'est pratiquement terminé. Incroyable ce qu'un oreiller peut changer." },
    { name: "Robert Martin", city: "Lyon", neckBody: "Mes douleurs au cou étaient quotidiennes à cause du sommeil sur le côté, et mes épaules étaient tendues. Cet oreiller maintient la tête droite et les douleurs au cou ont cessé. Une énorme différence.", backBody: "Dormir sur le côté me donnait un bras mort chaque matin. Mon épaule était comprimée toute la nuit. Cet oreiller supprime la pression et l'engourdissement a disparu." },
    { name: "Patricia Bernard", city: "Marseille", neckBody: "J'avais cette sensation constante de raideur dans le cou, comme si j'avais mal dormi. Depuis que j'utilise cet oreiller, mon cou est redevenu normal le matin.", backBody: "J'avais des engourdissements dans le bras depuis des années et j'accusais le matelas. Cet oreiller maintient l'épaule libre et les engourdissements ont cessé." },
  ],
  CA: [
    { name: "Margaret Thompson", city: "Toronto", neckBody: "I'm 62 and was waking with neck and shoulder pain most mornings. After a week on this pillow it's basically gone. I didn't think a pillow could do that, but it did.", backBody: "I'm 63 and used to wake up with a completely numb arm almost every morning. After a week on this pillow it's basically gone. Didn't think a pillow could fix that." },
    { name: "Robert Clarke", city: "Vancouver", neckBody: "My neck pain was every day from side sleeping, and my shoulders were tight too. This keeps my head level and the neck pain stopped. I still get normal aches, but not that sharp morning neck thing.", backBody: "Side sleeping always gave me a dead arm when I woke up. Since switching to this, the numbness and tingling are gone. Big difference." },
    { name: "Patricia Hughes", city: "Calgary", neckBody: "I had that constant stiff neck feeling, like I'd slept wrong. Since switching to this, I wake up and my neck feels normal again. No more neck and shoulder pain first thing.", backBody: "I had arm numbness for years and kept blaming the mattress. Turns out my pillow was crushing my shoulder. This one takes the pressure off and the numbness stopped." },
  ],
};

// Apply Eurozone countries that share the same set as their closest match
const EUROZONE_REVIEWER_FALLBACKS: Record<string, string> = {
  AT: 'DE', BE: 'NL', HR: 'DE', CY: 'DE', EE: 'DE',
  FI: 'SE', GR: 'DE', IE: 'GB', IT: 'FR', LV: 'DE',
  LT: 'DE', LU: 'DE', MT: 'GB', PT: 'FR', SK: 'DE',
  SI: 'DE', ES: 'FR',
};

function getLocalizedReviews(
  baseReviews: typeof neckPainReviews,
  buyerCountry?: string,
  focus?: PillowFocus
): typeof neckPainReviews {
  if (!buyerCountry || buyerCountry === 'US') return baseReviews;

  const countryKey = COUNTRY_REVIEWERS[buyerCountry]
    ? buyerCountry
    : EUROZONE_REVIEWER_FALLBACKS[buyerCountry] || null;

  if (!countryKey || !COUNTRY_REVIEWERS[countryKey]) return baseReviews;

  const overrides = COUNTRY_REVIEWERS[countryKey];
  return baseReviews.map((review, i) => {
    if (i < 3 && overrides[i]) {
      return {
        ...review,
        customer_name: overrides[i].name,
        city: overrides[i].city,
        body: focus === "back" ? overrides[i].backBody : overrides[i].neckBody,
      };
    }
    return review;
  });
}

interface MiniReviewsCarouselProps {
  productHandle?: string;
  pillowFocus?: PillowFocus;
  autoPlayInterval?: number;
  buyerCountry?: string;
}

export const MiniReviewsCarousel = ({ 
  productHandle = "ergonomic-pillow",
  pillowFocus = "neck",
  autoPlayInterval = 10000,
  buyerCountry,
}: MiniReviewsCarouselProps) => {
  const baseReviews = pillowFocus === "back" ? backPainReviews : neckPainReviews;
  const reviews = getLocalizedReviews(baseReviews, buyerCountry, pillowFocus);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [api, autoPlayInterval]);

  // Track current slide
  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm relative">
      {/* Carousel - full width */}
      <Carousel 
        setApi={setApi} 
        opts={{ loop: true }}
        className="w-full"
      >
        <CarouselContent>
          {reviews.map((review) => (
            <CarouselItem key={review.id}>
              <div className="px-3 py-3">
                {/* Review text - readable size for 55+, text flows under arrows */}
                <p className="text-sm sm:text-base text-foreground leading-relaxed mb-2 line-clamp-4">
                  "{review.body}"
                </p>

                {/* Author row with avatar, name, city, and stars - compact */}
                <div className="flex items-center gap-2">
                  <img
                    src={review.avatar}
                    alt={review.customer_name}
                    className="w-9 h-9 rounded-full object-cover border border-primary/10 flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {review.customer_name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {review.city}
                    </span>
                    {/* Stars - smaller, next to city */}
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating
                              ? "fill-[hsl(var(--star))] text-[hsl(var(--star))]"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Overlay arrows - very transparent, positioned on sides */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-transparent hover:bg-muted/10 transition-colors z-10"
        aria-label="Previous review"
      >
        <ChevronLeft className="w-4 h-4 text-muted-foreground/40" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-transparent hover:bg-muted/10 transition-colors z-10"
        aria-label="Next review"
      >
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </button>
    </div>
  );
};
