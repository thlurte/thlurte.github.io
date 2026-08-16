// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-research",
          title: "research",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/research/";
          },
        },{id: "post-raii-in-high-performance-c",
        
          title: "RAII in High-Performance C++",
        
        description: "A comprehensive guide on Resource Acquisition Is Initialization (RAII) in high-performance C++ systems, exploring custom memory arenas, strided tensor views, exception safety, stack unwinding mechanics, and smart pointer overhead.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/raii-in-high-performance-cpp/";
          
        },
      },{id: "post-the-mathematical-foundations-of-vector-spaces-in-data-retrieval",
        
          title: "The Mathematical Foundations of Vector Spaces in Data Retrieval",
        
        description: "Mathematical foundations of vector spaces enabling intelligent data retrieval through basis representation, dimensionality, orthogonality, subspaces, and computational optimization principles.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/formatting-and-links/";
          
        },
      },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
          description: "",
          section: "News",},{id: "news-a-long-announcement-with-details",
          title: 'A long announcement with details',
          description: "",
          section: "News",handler: () => {
              window.location.href = "/news/announcement_2/";
            },},{id: "news-a-simple-inline-announcement-with-markdown-emoji-sparkles-smile",
          title: 'A simple inline announcement with Markdown emoji! :sparkles: :smile:',
          description: "",
          section: "News",},{id: "projects-transformer-pytorch",
          title: 'Transformer Pytorch',
          description: "pytorch implementation of Vaswani et, al. (2017)",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{id: "projects-clip-pytorch",
          title: 'CLIP Pytorch',
          description: "pytorch implementation of Radford et al. (2021)",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project/";
            },},{id: "projects-resnet-pytorch",
          title: 'ResNet-pytorch',
          description: "pytorch implementation of He et al. (2016)",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project/";
            },},{id: "projects-siamesenet-tensorflow",
          title: 'SiameseNet-tensorflow',
          description: "tensorflow implementation of Koch et al. (2015)",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project/";
            },},{id: "projects-alexnet-tensorflow",
          title: 'AlexNet-tensorflow',
          description: "tensorflow implementation of Krizhevsky et al., (2012)",
          section: "Projects",handler: () => {
              window.location.href = "/projects/5_project/";
            },},{id: "research-on-the-limits-of-small-language-models-in-vectorized-code-synthesis",
          title: 'On the Limits of Small Language Models in Vectorized Code Synthesis',
          description: "An in-depth empirical investigation into structural rule acquisition, the Execution Gap, and parameter scaling dynamics across 0.5B–7B language models in vectorized code synthesis.",
          section: "Research",handler: () => {
              window.location.href = "/research/limits-of-small-models-in-vectorized-code-synthesis/";
            },},{id: "research-the-failure-modes-of-weight-space-model-merging-in-neural-code-synthesis",
          title: 'The Failure Modes of Weight-Space Model Merging in Neural Code Synthesis',
          description: "An empirical investigation into DARE-TIES, SLERP, and Task Arithmetic: why weight-space model merging between Code and Math models induces catastrophic syntactic interference in small language models.",
          section: "Research",handler: () => {
              window.location.href = "/research/failure-modes-of-model-merging-in-neural-code-synthesis/";
            },},{
        id: 'social-discord',
        title: 'Discord',
        section: 'Socials',
        handler: () => {
          window.open("https://discord.com/users/thlurte", "_blank");
        },
      },{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%74%68%6C%75%72%74%65@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/thlurte", "_blank");
        },
      },{
        id: 'social-leetcode',
        title: 'LeetCode',
        section: 'Socials',
        handler: () => {
          window.open("https://leetcode.com/u/thlurte/", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/thlurte", "_blank");
        },
      },{
        id: 'social-x',
        title: 'X',
        section: 'Socials',
        handler: () => {
          window.open("https://twitter.com/thlurte", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
