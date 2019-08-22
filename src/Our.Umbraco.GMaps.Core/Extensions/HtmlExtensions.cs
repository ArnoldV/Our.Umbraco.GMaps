using System.Web;
using System.Web.Mvc;
using System.Web.Mvc.Html;

namespace Our.Umbraco.GMaps.Extensions
{
    public static class HtmlExtensions
    {
        public static HtmlString RenderMapScripts(this HtmlHelper helper, Our.Umbraco.GMaps.Models.GmapsModel model)
        {
            return helper.Partial("~/Views/Partials/Our.Umbraco.GMaps/MapScripts.cshtml", model);
        }
    }
}
