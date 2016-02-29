#ifdef USE_LOGDEPTHBUF

	uniform float logDepthBufFC;

	#ifdef USE_LOGDEPTHBUF_EXT

		//#extension GL_EXT_frag_depth : enable
		varying float vFragDepth;

	#endif

#endif

const int   TEX_UNITS   = 8;
const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI2         = 1.57079632679;
const float PI4         = 0.78539816339;
const float poleSud     = -82.0 / 180.0 * PI;
const float poleNord    =  84.0 / 180.0 * PI;

uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[TEX_UNITS];
uniform vec3        pitScale_L01[TEX_UNITS];
uniform int         RTC;
uniform int         selected;
uniform int         uuid;
uniform int         pickingRender;
uniform int         nbTextures_00;
uniform int         nbTextures_01;
uniform float       distanceFog;
uniform int         debug;
uniform vec3        lightPosition;
uniform int lightingOn;

varying vec2        vUv_0;
varying float       vUv_1;
varying vec3        vNormal;
varying vec4        pos;


//#define BORDERLINE

vec2    pitUV(vec2 uvIn, vec3 pit)
{     
    vec2  uv;
    uv.x = uvIn.x* pit.z + pit.x;
    uv.y = 1.0 -( (1.0 - uvIn.y) * pit.z + pit.y);
    
    return uv;
}

#if defined(BORDERLINE)
const float sLine = 0.002;
#endif
const float borderS = 0.007;

// GLSL 1.30 only accepts constant expressions when indexing into arrays,
// so we have to resort to an if/else cascade.

vec4 colorAtIdUv(int id, vec2 uv){
    
    if (id == 0) return texture2D(dTextures_01[0],  pitUV(uv,pitScale_L01[0]));
    else if (id == 1) return texture2D(dTextures_01[1],  pitUV(uv,pitScale_L01[1]));
    else if (id == 2) return texture2D(dTextures_01[2],  pitUV(uv,pitScale_L01[2]));          
    else if (id == 3) return texture2D(dTextures_01[3],  pitUV(uv,pitScale_L01[3]));           
    else if (id == 4) return texture2D(dTextures_01[4],  pitUV(uv,pitScale_L01[4]));           
    else if (id == 5) return texture2D(dTextures_01[5],  pitUV(uv,pitScale_L01[5]));
    else if (id == 5) return texture2D(dTextures_01[6],  pitUV(uv,pitScale_L01[6]));
    else if (id == 5) return texture2D(dTextures_01[7],  pitUV(uv,pitScale_L01[7]));
    else return vec4(0.0,0.0,0.0,0.0);        
    
}

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    if(pickingRender == 1)
    {
        gl_FragColor =vec4(pos.x,pos.y,pos.z,uuid);

        #if defined(BORDERLINE)

        #endif

    }else
    #if defined(BORDERLINE)
    if(vUv_0.x < sLine || vUv_0.x > 1.0 - sLine || vUv_0.y < sLine || vUv_0.y > 1.0 - sLine)
        gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0);
    else
    #endif
    if(selected == 1 && (vUv_0.x < borderS || vUv_0.x > 1.0 - borderS || vUv_0.y < borderS || vUv_0.y > 1.0 - borderS))
        gl_FragColor = vec4( 1.0, 0.3, 0.0, 1.0);
    else
    {
        vec2 uvO ;
        uvO.x           = vUv_0.x;
        float y         = vUv_1;
        int idd         = int(floor(y));
        uvO.y           = y - float(idd);
        idd             = nbTextures_01 - idd - 1;

        if(nbTextures_01 == idd)
        {
            idd     = nbTextures_01 - 1 ;
            uvO.y   = 0.0;
        }

        gl_FragColor    = vec4( 0.04, 0.23, 0.35, 1.0);
        #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
        

        float depth = gl_FragDepthEXT / gl_FragCoord.w;
        float fog = 1.0/(exp(depth/distanceFog));

        #else
        
        float fog = 1.0;
        #endif

        vec4 fogColor = vec4( 0.76, 0.85, 1.0, 1.0);
        float memoY = uvO.y;

        if (0 <= idd && idd < TEX_UNITS)
        {
            vec4 diffuseColor = colorAtIdUv(idd, uvO);
            if(RTC == 1)
            {
                gl_FragColor = mix(fogColor, diffuseColor, fog );
            }
            else
            {
                gl_FragColor = diffuseColor;
                
            }
        }

        if(lightingOn == 1){   // Add lighting
            float light = dot(vNormal, lightPosition); //normalize(pos.xyz)
            gl_FragColor.rgb *= light;
        }
    }

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

}
