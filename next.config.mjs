export default {output:'export',images:{unoptimized:true},typescript:{ignoreBuildErrors:true},eslint:{ignoreDuringBuilds:true},webpack:(c)=>{c.resolve.alias.canvas=false;return c}};
