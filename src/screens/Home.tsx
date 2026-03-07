import { Link } from 'react-router-dom';

const demos = [
  {
    to: '/infinite-scroll',
    title: 'InfiniteScroll',
    description:
      'A photo feed powered by the Picsum API. Demonstrates single-direction infinite scrolling with automatic loading as you scroll down.',
    tag: 'Feed',
  },
  {
    to: '/bidirectional-scroll',
    title: 'BidirectionalScroll',
    description:
      'A chat interface powered by DummyJSON. Demonstrates bidirectional scrolling with scroll preservation when loading older messages.',
    tag: 'Chat',
  },
];

export const Home = () => (
  <div className="max-w-5xl mx-auto px-4 py-12">
    <div className="text-center mb-12">
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        react-observer-scroll
      </h1>
      <p className="text-muted-foreground max-w-lg mx-auto">
        Production-grade infinite and bidirectional scroll components powered
        by IntersectionObserver. Zero dependencies, tree-shakeable, SSR-safe.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      {demos.map((demo) => (
        <Link
          key={demo.to}
          to={demo.to}
          className="group block rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20 hover:bg-accent"
        >
          <div className="flex items-center gap-2 mb-2">
            <h2 className="font-semibold">{demo.title}</h2>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {demo.tag}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{demo.description}</p>
        </Link>
      ))}
    </div>
  </div>
);
